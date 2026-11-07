// ----------------------------------------------------------------
// test_handlers.js
// Calls every handler directly (no HTTP, no routes needed) and checks
// that the data really lands in MongoDB. Cleans up after itself.
//
// Run from the project root:
//     node --env-file=.env test_handlers.js
//
// Adjust the import paths below if your folders are named differently.
// ----------------------------------------------------------------
import { connectToMongoDB, disconnectFromMongoDB } from "./DB.js"

// models
import Employee   from "./models/employee_model.js"
import Course     from "./models/course_model.js"
import Program    from "./models/program_model.js"
import Semester   from "./models/semester_model.js"
import Student    from "./models/student_model.js"
import Block      from "./models/block_model.js"
import Enrollment from "./models/enrollment_model.js"
import Counter    from "./models/studentID_generator.js"

// handlers
import { createEmployee }   from "./handlers/employee_handler.js"
import { createCourse }     from "./handlers/course_handler.js"
import { createProgram }    from "./handlers/program_handler.js"
import { createSemester }   from "./handlers/semester_handler.js"
import { createStudent }    from "./handlers/student_handler.js"
import { createBlock }      from "./handlers/block_handler.js"
import { createEnrollment } from "./handlers/enrollment_handler.js"

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

async function call(handler, body) {
    const res = mockRes()
    await handler({ body }, res)
    return res
}

function report(ok, label, detail = "") {
    if (ok) { passed++; console.log(`  PASS  ${label}`) }
    else    { failed++; console.log(`  FAIL  ${label}${detail ? "  -> " + detail : ""}`) }
}

// Expect a successful create (201) AND verify the document exists in MongoDB
async function expectCreated(label, handler, body, Model, track) {
    const res = await call(handler, body)
    if (res.statusCode !== 201) {
        report(false, label, `status ${res.statusCode}: ${res.body?.error}`)
        return null
    }
    const id = res.body._id
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
async function expectStatus(label, handler, body, status) {
    const res = await call(handler, body)
    report(res.statusCode === status, label,
        `expected ${status}, got ${res.statusCode} ${res.body?.error ?? ""}`)
}

// ---------- the tests ----------
async function runTests() {
    console.log("\n== Creating records (in dependency order) ==")

    const employee = await expectCreated("Employee", createEmployee,
        { first_name: "Test", middle_name: "Q", last_name: "Instructor" },
        Employee, "employees")

    const course1 = await expectCreated("Course (no prerequisites)", createCourse,
        { name: "TEST Intro to Programming", units: 3, prerequisites: [] },
        Course, "courses")

    const course2 = await expectCreated("Course (with prerequisite)", createCourse,
        { name: "TEST Web Programming", units: 3, prerequisites: course1 ? [course1._id] : [] },
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
            term: "1st",
            academic_year: TEST_YEAR,
            offerings: [
                { course: course1?._id },                           // course_active defaults to true
                { course: course2?._id, course_active: false }
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
            approved_by: employee?._id,
            program: program?._id,
            semester: semester?._id,
            block: block?._id,
            standing_year: 1
        },
        Enrollment, "enrollments")

    console.log("\n== Validation and duplicate checks (should be rejected) ==")

    await expectStatus("Employee missing last_name -> 400", createEmployee,
        { first_name: "NoLastName" }, 400)

    await expectStatus("Course missing name -> 400", createCourse,
        { units: 3 }, 400)

    await expectStatus("Program missing name -> 400", createProgram,
        { major: "Nothing" }, 400)

    await expectStatus("Semester with invalid term '4th' -> 400", createSemester,
        { term: "4th", academic_year: TEST_YEAR }, 400)

    await expectStatus("Duplicate semester -> 409", createSemester,
        { term: "1st", academic_year: TEST_YEAR }, 409)

    await expectStatus("Duplicate block section -> 409", createBlock,
        { semester: semester?._id, section_name: "TEST-IT-1A" }, 409)

    await expectStatus("Duplicate enrollment -> 409", createEnrollment,
        {
            student: student?._id,
            approved_by: employee?._id,
            program: program?._id,
            semester: semester?._id,
            block: block?._id,
            standing_year: 1
        }, 409)
}

// ---------- cleanup ----------
async function cleanup() {
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
