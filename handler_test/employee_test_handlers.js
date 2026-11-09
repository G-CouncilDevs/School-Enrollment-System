import mongoose from "mongoose"
import { connectToMongoDB, disconnectFromMongoDB } from "../DB.js"
 
import Employee   from "../models/employee_model.js"
import Enrollment from "../models/enrollment_model.js"
import Block      from "../models/block_model.js"
 
import {
    createEmployee, getEmployees, getEmployee, updateEmployee, deleteEmployee
} from "../handlers/employee_handler.js"
 
// Seconds to wait (so you can look at the employee in Atlas) before the final delete
const PAUSE_SECONDS = 10
 
// ---------- tiny test helpers ----------
let passed = 0
let failed = 0
const leftovers = { employees: [], enrollments: [], blocks: [] }
 
function mockRes() {
    const res = {
        statusCode: 200,
        body: null,
        status(code) { res.statusCode = code; return res },
        json(data)   { res.body = data; return res }
    }
    return res
}
 
async function call(handler, { params = {}, query = {}, body = {} } = {}) {
    const res = mockRes()
    await handler({ params, query, body }, res, (err) => {
        if (err) {
            const status = err.status ?? (err.name === "ValidationError" || err.name === "CastError" ? 400 : 500)
            res.status(status).json({ error: err.message })
        }
    })
    return res
}
 
function check(ok, label, detail = "") {
    if (ok) { passed++; console.log(`  PASS  ${label}`) }
    else    { failed++; console.log(`  FAIL  ${label}${detail ? "  -> " + detail : ""}`) }
}
 
function expectStatus(label, res, status) {
    check(res.statusCode === status, label,
        `expected ${status}, got ${res.statusCode} ${res.body?.error ?? ""}`)
}
 
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
 
// A valid ObjectId that no employee has
const unknownId = () => String(new mongoose.Types.ObjectId())
 
// ---------- the tests ----------
async function runTests() {
    // ===== CREATE =====
    console.log("\n== CREATE ==")
 
    const created = await call(createEmployee, { body: {
        first_name: "Maria", middle_name: "Reyes", last_name: "TEST-Santos",
        email: "test.maria.santos@example.com", password: "TestPass123!"
    }})
    expectStatus("Create employee -> 201", created, 201)
    if (created.statusCode !== 201) {
        console.log("  Cannot continue without a created employee.")
        return
    }
 
    const id = String(created.body._id)
    leftovers.employees.push(id)
 
    check(await Employee.exists({ _id: id }) !== null, `Employee is saved in the database (id: ${id})`)
    check(/^[0-9a-f]{24}$/.test(id), "Employee id is a MongoDB ObjectId", `got ${id}`)
 
    expectStatus("Create without first_name -> 400",
        await call(createEmployee, { body: { last_name: "TEST-NoFirstName" } }), 400)
    expectStatus("Create without last_name -> 400",
        await call(createEmployee, { body: { first_name: "TEST-NoLastName" } }), 400)
 
    const noMiddle = await call(createEmployee, { body: { first_name: "Pedro", last_name: "TEST-NoMiddle", email: "test.pedro.nomiddle@example.com", password: "TestPass123!" } })
    expectStatus("Create without middle_name (optional) -> 201", noMiddle, 201)
    if (noMiddle.statusCode === 201) leftovers.employees.push(String(noMiddle.body._id))
 
    // ===== GET ONE =====
    console.log("\n== GET ONE ==")
 
    const one = await call(getEmployee, { params: { id } })
    expectStatus("Get existing employee -> 200", one, 200)
    check(one.body?.last_name === "TEST-Santos", "Returned the right employee", `got ${one.body?.last_name}`)
 
    expectStatus("Get unknown id -> 404", await call(getEmployee, { params: { id: unknownId() } }), 404)
    expectStatus("Get invalid id -> 400", await call(getEmployee, { params: { id: "abc" } }), 400)
 
    // ===== GET ALL =====
    console.log("\n== GET ALL ==")
 
    const list = await call(getEmployees, { query: { last_name: "test-san" } })
    expectStatus("List with last_name filter -> 200", list, 200)
    check(list.body?.employees?.some(e => String(e._id) === id), "Filter is case-insensitive and finds the employee")
    check(list.body?.total >= 1 && list.body?.page === 1, "Response has page and total")
 
    const small = await call(getEmployees, { query: { limit: "1" } })
    check(small.body?.employees?.length <= 1, "limit=1 returns at most one employee")
 
    const none = await call(getEmployees, { query: { last_name: "ZZZ-no-such-name" } })
    check(none.statusCode === 200 && none.body.employees.length === 0, "No match returns an empty list")
 
    const regex = await call(getEmployees, { query: { last_name: ".*" } })
    check(regex.statusCode === 200 && regex.body.employees.length === 0,
        "Regex symbols in last_name are treated as plain text")
 
    // ===== UPDATE =====
    console.log("\n== UPDATE ==")
 
    const otherId = unknownId()
    const upd = await call(updateEmployee, {
        params: { id },
        body: { first_name: "Marites", middle_name: "Cruz", _id: otherId }
    })
    expectStatus("Update first_name and middle_name -> 200", upd, 200)
 
    const fresh = await Employee.findById(id)
    check(fresh?.first_name === "Marites", "first_name was changed")
    check(fresh?.middle_name === "Cruz", "middle_name was changed")
    check(fresh?.last_name === "TEST-Santos", "Fields not sent were left alone")
    check(String(upd.body?._id) === id, "_id in the body was ignored")
    check(await Employee.exists({ _id: otherId }) === null, "No employee was created under the _id from the body")
 
    expectStatus("Update first_name to empty text -> 400",
        await call(updateEmployee, { params: { id }, body: { first_name: "" } }), 400)
    expectStatus("Update with no valid fields -> 400",
        await call(updateEmployee, { params: { id }, body: { nonsense: "x" } }), 400)
    expectStatus("Update unknown id -> 404",
        await call(updateEmployee, { params: { id: unknownId() }, body: { first_name: "A" } }), 404)
    expectStatus("Update invalid id -> 400",
        await call(updateEmployee, { params: { id: "abc" }, body: { first_name: "A" } }), 400)
 
    // ===== DELETE =====
    console.log("\n== DELETE ==")
 
    // Random ids stand in for the other documents (Mongoose does not check that referenced
    // documents exist). Only the employee reference matters for these tests.
    const enrollment = await Enrollment.create({
        student: 9999999999,
        approved_by: id,
        program:     new mongoose.Types.ObjectId(),
        semester:    new mongoose.Types.ObjectId(),
        block:       new mongoose.Types.ObjectId(),
        standing_year: 1
    })
    leftovers.enrollments.push(enrollment._id)
 
    expectStatus("Delete employee who approved an enrollment -> 409",
        await call(deleteEmployee, { params: { id } }), 409)
    check(await Employee.exists({ _id: id }) !== null, "Employee is still in the database after the refusal")
 
    await Enrollment.deleteOne({ _id: enrollment._id })
 
    const block = await Block.create({
        semester: new mongoose.Types.ObjectId(),
        section_name: "TEST-EMPLOYEE-BLOCK",
        courses: [{ course: new mongoose.Types.ObjectId(), employee: id }]
    })
    leftovers.blocks.push(block._id)
 
    expectStatus("Delete employee who teaches in a block -> 409",
        await call(deleteEmployee, { params: { id } }), 409)
 
    await Block.deleteOne({ _id: block._id })
 
    console.log(`\n  Pausing ${PAUSE_SECONDS} seconds: check the employee in Atlas now (employees collection)...`)
    await sleep(PAUSE_SECONDS * 1000)
 
    expectStatus("Delete employee with no references -> 200",
        await call(deleteEmployee, { params: { id } }), 200)
    check(await Employee.exists({ _id: id }) === null, "Employee is gone from the database")
 
    expectStatus("Delete the same employee again -> 404",
        await call(deleteEmployee, { params: { id } }), 404)
    expectStatus("Delete invalid id -> 400",
        await call(deleteEmployee, { params: { id: "abc" } }), 400)
}
 
// ---------- cleanup (also runs if a test crashed halfway) ----------
async function cleanup() {
    console.log("\n== Cleaning up ==")
    const results = await Promise.all([
        Enrollment.deleteMany({ _id: { $in: leftovers.enrollments } }),
        Block.deleteMany({ _id: { $in: leftovers.blocks } }),
        Employee.deleteMany({ _id: { $in: leftovers.employees } })
    ])
    const total = results.reduce((sum, r) => sum + r.deletedCount, 0)
    console.log(`  Removed ${total} leftover test document(s)`)
}
 
// ---------- main ----------
async function main() {
    const conn = await connectToMongoDB()
    if (!conn) {
        console.error("Could not connect to MongoDB. Check your .env credentials.")
        process.exitCode = 1
        return
    }
 
    try {
        await runTests()
    } catch (err) {
        failed++
        console.error("\nUnexpected error during tests:", err)
    } finally {
        try { await cleanup() } catch (err) { console.error("Cleanup failed:", err.message) }
        await disconnectFromMongoDB()
    }
 
    console.log(`\n== Result: ${passed} passed, ${failed} failed ==`)
    process.exitCode = failed > 0 ? 1 : 0
}
 
main()
