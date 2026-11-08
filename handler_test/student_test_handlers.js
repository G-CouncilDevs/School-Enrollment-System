import mongoose from "mongoose"
import { connectToMongoDB, disconnectFromMongoDB } from "./DB.js"
 
import Student    from "./models/student_model.js"
import Enrollment from "./models/enrollment_model.js"
import Block      from "./models/block_model.js"
import Counter    from "./models/studentID_generator.js"
 
import {
    createStudent, getStudents, getStudent, updateStudent, deleteStudent
} from "./handlers/student_handler.js"
 
// Seconds to wait (so you can look at the student in Atlas) before the final delete
const PAUSE_SECONDS = 10
 
// ---------- tiny test helpers ----------
let passed = 0
let failed = 0
let createAttempts = 0           // every createStudent call uses up a counter number
const leftovers = { students: [], enrollments: [], blocks: [] }
 
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
    await handler({ params, query, body }, res)
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
 
// ---------- the tests ----------
async function runTests() {
    // ===== CREATE =====
    console.log("\n== CREATE ==")
 
    createAttempts++
    const created = await call(createStudent, { body: {
        first_name: "Juan", middle_name: "Santos", last_name: "TEST-Dela Cruz",
        sex: "Male", birth_date: "2005-04-12",
        address: { street: "12 Rizal St", barangay: "Poblacion", city: "Talavera", province: "Nueva Ecija" }
    }})
    expectStatus("Create student -> 201", created, 201)
    if (created.statusCode !== 201) {
        console.log("  Cannot continue without a created student.")
        return
    }
 
    const id = created.body._id
    leftovers.students.push(id)
 
    check(await Student.exists({ _id: id }) !== null, `Student is saved in the database (id: ${id})`)
    check(/^\d{10}$/.test(String(id)) && String(id).startsWith(String(new Date().getFullYear())),
        "Student id has format YYYY + 6 digits", `got ${id}`)
 
    createAttempts++
    expectStatus("Create without first_name -> 400",
        await call(createStudent, { body: { last_name: "TEST-NoFirstName" } }), 400)
 
    createAttempts++
    expectStatus("Create with invalid sex -> 400",
        await call(createStudent, { body: { first_name: "X", last_name: "TEST-BadSex", sex: "Other" } }), 400)
 
    // ===== GET ONE =====
    console.log("\n== GET ONE ==")
 
    const one = await call(getStudent, { params: { id: String(id) } })
    expectStatus("Get existing student -> 200", one, 200)
    check(one.body?.last_name === "TEST-Dela Cruz", "Returned the right student", `got ${one.body?.last_name}`)
 
    expectStatus("Get unknown id -> 404", await call(getStudent, { params: { id: "1234567890" } }), 404)
    expectStatus("Get non-numeric id -> 400", await call(getStudent, { params: { id: "abc" } }), 400)
 
    // ===== GET ALL =====
    console.log("\n== GET ALL ==")
 
    const list = await call(getStudents, { query: { last_name: "test-dela" } })
    expectStatus("List with last_name filter -> 200", list, 200)
    check(list.body?.students?.some(s => s._id === id), "Filter is case-insensitive and finds the student")
    check(list.body?.total >= 1 && list.body?.page === 1, "Response has page and total")
 
    const small = await call(getStudents, { query: { limit: "1" } })
    check(small.body?.students?.length <= 1, "limit=1 returns at most one student")
 
    const none = await call(getStudents, { query: { last_name: "ZZZ-no-such-name" } })
    check(none.statusCode === 200 && none.body.students.length === 0, "No match returns an empty list")
 
    const regex = await call(getStudents, { query: { last_name: ".*" } })
    check(regex.statusCode === 200 && regex.body.students.length === 0,
        "Regex symbols in last_name are treated as plain text")
 
    // ===== UPDATE =====
    console.log("\n== UPDATE ==")
 
    const upd = await call(updateStudent, {
        params: { id: String(id) },
        body: { first_name: "Juanito", address: { city: "Cabanatuan" }, _id: 1 }
    })
    expectStatus("Update first_name and address.city -> 200", upd, 200)
 
    const fresh = await Student.findById(id)
    check(fresh?.first_name === "Juanito", "first_name was changed")
    check(fresh?.address?.city === "Cabanatuan", "address.city was changed")
    check(fresh?.address?.street === "12 Rizal St", "address.street was NOT erased")
    check(fresh?.last_name === "TEST-Dela Cruz", "Fields not sent were left alone")
    check(upd.body?._id === id, "_id in the body was ignored")
 
    expectStatus("Update with invalid sex -> 400",
        await call(updateStudent, { params: { id: String(id) }, body: { sex: "Other" } }), 400)
    expectStatus("Update with no valid fields -> 400",
        await call(updateStudent, { params: { id: String(id) }, body: { nonsense: "x" } }), 400)
    expectStatus("Update unknown id -> 404",
        await call(updateStudent, { params: { id: "1234567890" }, body: { first_name: "A" } }), 404)
    expectStatus("Update non-numeric id -> 400",
        await call(updateStudent, { params: { id: "abc" }, body: { first_name: "A" } }), 400)
 
    // ===== DELETE =====
    console.log("\n== DELETE ==")
 
    // The enrollment and block only need to point at this student, so random ids stand in
    // for the other documents (Mongoose does not check that referenced documents exist).
    const enrollment = await Enrollment.create({
        student: id,
        approved_by: new mongoose.Types.ObjectId(),
        program:     new mongoose.Types.ObjectId(),
        semester:    new mongoose.Types.ObjectId(),
        block:       new mongoose.Types.ObjectId(),
        standing_year: 1
    })
    leftovers.enrollments.push(enrollment._id)
 
    expectStatus("Delete student with an enrollment -> 409",
        await call(deleteStudent, { params: { id: String(id) } }), 409)
    check(await Student.exists({ _id: id }) !== null, "Student is still in the database after the refusal")
 
    await Enrollment.deleteOne({ _id: enrollment._id })
 
    const block = await Block.create({
        semester: new mongoose.Types.ObjectId(),
        section_name: "TEST-STUDENT-BLOCK",
        students: [id]
    })
    leftovers.blocks.push(block._id)
 
    expectStatus("Delete student who is in a block -> 409",
        await call(deleteStudent, { params: { id: String(id) } }), 409)
 
    await Block.deleteOne({ _id: block._id })
 
    console.log(`\n  Pausing ${PAUSE_SECONDS} seconds: check the student in Atlas now (students collection)...`)
    await sleep(PAUSE_SECONDS * 1000)
 
    expectStatus("Delete student with no references -> 200",
        await call(deleteStudent, { params: { id: String(id) } }), 200)
    check(await Student.exists({ _id: id }) === null, "Student is gone from the database")
 
    expectStatus("Delete the same student again -> 404",
        await call(deleteStudent, { params: { id: String(id) } }), 404)
    expectStatus("Delete non-numeric id -> 400",
        await call(deleteStudent, { params: { id: "abc" } }), 400)
}
 
// ---------- cleanup (also runs if a test crashed halfway) ----------
async function cleanup() {
    console.log("\n== Cleaning up ==")
    const results = await Promise.all([
        Enrollment.deleteMany({ _id: { $in: leftovers.enrollments } }),
        Block.deleteMany({ _id: { $in: leftovers.blocks } }),
        Student.deleteMany({ _id: { $in: leftovers.students } })
    ])
    const total = results.reduce((sum, r) => sum + r.deletedCount, 0)
    console.log(`  Removed ${total} leftover test document(s)`)
 
    // Every createStudent call used up a student number; give them back
    if (createAttempts > 0) {
        const year = new Date().getFullYear()
        await Counter.findByIdAndUpdate(`student-${year}`, { $inc: { seq: -createAttempts } })
        console.log(`  Restored the student id counter (${createAttempts} number(s))`)
    }
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
