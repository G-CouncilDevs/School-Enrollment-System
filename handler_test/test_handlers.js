import { connectToMongoDB, disconnectFromMongoDB } from "../DB.js"
 
// models
import Employee   from "../models/employee_model.js"
import Course     from "../models/course_model.js"
import Program    from "../models/program_model.js"
import Semester   from "../models/semester_model.js"
import Student    from "../models/student_model.js"
import Block      from "../models/block_model.js"
import Enrollment from "../models/enrollment_model.js"
import Counter    from "../models/studentID_generator.js"
 
// handlers
import { createEmployee }   from "../handlers/employee_handler.js"
import { createCourse }     from "../handlers/course_handler.js"
import { createProgram }    from "../handlers/program_handler.js"
import { createSemester }   from "../handlers/semester_handler.js"
import { createStudent }    from "../handlers/student_handler.js"
import { createBlock }      from "../handlers/block_handler.js"
import { createEnrollment } from "../handlers/enrollment_handler.js"
 
// Test data uses an unrealistic academic year so it can't clash with real data.
const TEST_YEAR = 9999
 
// ---------- tiny test helpers ----------
let passed = 0
let failed = 0
 
const created = {
    employees: [], courses: [], programs: [], semesters: [],
    students: [], blocks: [], enrollments: []
}
let studentsCreated = 0
 
function mockRes() {
    const res = {
        statusCode: 200,
        body: null,
        status(code) { res.statusCode = code; return res },
        json(data)   { res.body = data; return res }
    }
    return res
}
 
async function call(handler, body, sessionOverrides = {}) {
    const res = mockRes()
    await handler({ body, session: { employeeId: null, ...sessionOverrides }, params: {}, query: {} }, res)
    return res
}
 
function report(ok, label, detail = "") {
    if (ok) { passed++; console.log(`  PASS  ${label}`) }
    else    { failed++; console.log(`  FAIL  ${label}${detail ? "  -> " + detail : ""}`) }
}
 
// Expect a successful create (201) AND verify the document exists in MongoDB
// idKey: dot-path to the id in the response body (default "_id", use "enrollment._id" for enrollments)
async function expectCreated(label, handler, body, Model, track, session = {}, idKey = "_id") {
    const res = mockRes()
    await handler({ body, session: { employeeId: null, ...session }, params: {}, query: {} }, res)
    if (res.statusCode !== 201) {
        report(false, label, `status ${res.statusCode}: ${res.body?.error}`)
        return null
    }
    // Resolve dot-path (e.g. "enrollment._id")
    const id = idKey.split(".").reduce((obj, k) => obj?.[k], res.body)
    const inDb = await Model.exists({ _id: id })
    if (!inDb) {
        report(false, label, "handler said 201 but document is not in the database")
        return null
    }
    created[track].push(id)
    report(true, `${label} (id: ${id})`)
    return res.body
}
 
// Expect a specific error status (validation / duplicate checks)
async function expectStatus(label, handler, body, status, session = {}) {
    const res = mockRes()
    await handler({ body, session: { employeeId: null, ...session }, params: {}, query: {} }, res)
    report(res.statusCode === status, label,
        `expected ${status}, got ${res.statusCode} ${res.body?.error ?? ""}`)
}
 
// ---------- the tests ----------
async function runTests() {
    console.log("\n== Creating records (in dependency order) ==")
 
    const employee = await expectCreated("Employee", createEmployee,
        { first_name: "Test", middle_name: "Q", last_name: "Instructor",
          email: "test.instructor.q@example.com", password: "TestPass123!" },
        Employee, "employees")
 
    const course1 = await expectCreated("Course (no prerequisites)", createCourse,
        { code: "TEST-CS101", name: "TEST Intro to Programming", units: 3, prerequisites: [] },
        Course, "courses")
 
    const course2 = await expectCreated("Course (with prerequisite)", createCourse,
        { code: "TEST-CS201", name: "TEST Web Programming", units: 3, prerequisites: course1 ? [course1._id] : [] },
        Course, "courses")
 
    const program = await expectCreated("Program", createProgram,
        {
            name: "TEST BS Information Technology",
            major: "Web Development",
            courses: [
                { course: course1?._id, year_level: 1 },
                { course: course2?._id, year_level: 2 }
            ]
        },
        Program, "programs")
 
    const semester = await expectCreated("Semester", createSemester,
        {
            semester_term: "1st",
            academic_year: TEST_YEAR,
            offerings: [
                { course: course1?._id, capacity: 40 },
                { course: course2?._id, capacity: 40, course_active: false }
            ]
        },
        Semester, "semesters")
 
    const student = await expectCreated("Student (auto id)", createStudent,
        {
            first_name: "Juan", middle_name: "Santos", last_name: "TEST-Dela Cruz",
            sex: "Male", birth_date: "2005-04-12",
            address: { street: "12 Rizal St", barangay: "Poblacion", city: "Talavera", province: "Nueva Ecija" }
        },
        Student, "students")
    if (student) studentsCreated++
 
    if (student) {
        const idText = String(student._id)
        report(/^\d{10}$/.test(idText) && idText.startsWith(String(new Date().getFullYear())),
            `Student id has format YYYY + 6 digits`, `got ${idText}`)
    }
 
    const block = await expectCreated("Block", createBlock,
        {
            semester: semester?._id,
            section_name: "TEST-IT-1A",
            courses: [{ course: course1?._id, employee: employee?._id, schedule: "MWF 8:00-9:00", room: "204" }],
            students: student ? [student._id] : []
        },
        Block, "blocks")
 
    await expectCreated("Enrollment", createEnrollment,
        {
            student: student?._id,
            program: program?._id,
            semester: semester?._id,
            block: block?._id,
            standing_year: 1
        },
        Enrollment, "enrollments", { employeeId: String(employee?._id) }, "enrollment._id")
 
    console.log("\n== Validation and duplicate checks (should be rejected) ==")
 
    await expectStatus("Employee missing last_name -> 400", createEmployee,
        { first_name: "NoLastName" }, 400)
 
    await expectStatus("Course missing name -> 400", createCourse,
        { units: 3 }, 400)
 
    await expectStatus("Program missing name -> 400", createProgram,
        { major: "Nothing" }, 400)
 
    await expectStatus("Semester with invalid term '4th' -> 400", createSemester,
        { semester_term: "4th", academic_year: TEST_YEAR }, 400)
 
    await expectStatus("Duplicate semester -> 409", createSemester,
        { semester_term: "1st", academic_year: TEST_YEAR, offerings: [] }, 409)
 
    await expectStatus("Duplicate block section -> 409", createBlock,
        { semester: semester?._id, section_name: "TEST-IT-1A" }, 409)
 
    await expectStatus("Duplicate enrollment -> 409", createEnrollment,
        {
            student: student?._id,
            program: program?._id,
            semester: semester?._id,
            block: block?._id,
            standing_year: 1
        }, 409, { employeeId: String(employee?._id) })
}
 
// ---------- cleanup ----------
async function cleanup() {
    console.log("\n== Pausing 10 seconds so you can check the data in Atlas ==")
    console.log("   (refresh your collections now, the test data will be deleted after the pause)")
    await new Promise((resolve) => setTimeout(resolve, 10000))
 
    console.log("\n== Cleaning up test data ==")
    const ids = (list) => ({ _id: { $in: list } })
 
    const results = await Promise.all([
        Enrollment.deleteMany(ids(created.enrollments)),
        Block.deleteMany(ids(created.blocks)),
        Student.deleteMany(ids(created.students)),
        Semester.deleteMany(ids(created.semesters)),
        Program.deleteMany(ids(created.programs)),
        Course.deleteMany(ids(created.courses)),
        Employee.deleteMany(ids(created.employees))
    ])
    const total = results.reduce((sum, r) => sum + r.deletedCount, 0)
    console.log(`  Removed ${total} test documents`)
 
    // The student test consumed id numbers from the counter; give them back
    if (studentsCreated > 0) {
        const year = new Date().getFullYear()
        await Counter.findByIdAndUpdate(`student-${year}`, { $inc: { seq: -studentsCreated } })
        console.log(`  Restored the student id counter (${studentsCreated} number(s))`)
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
