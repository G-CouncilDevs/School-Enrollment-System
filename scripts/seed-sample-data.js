import { connectToMongoDB, disconnectFromMongoDB } from "../DB.js";
import Program from "../models/program_model.js";
import Semester from "../models/semester_model.js";
import Course from "../models/course_model.js";
import Block from "../models/block_model.js";
import Student from "../models/student_model.js";
import Employee from "../models/employee_model.js";
import Enrollment from "../models/enrollment_model.js";
import CourseEnrollment from "../models/course_enrollment_model.js";
import Counter from "../models/studentID_generator.js";

await connectToMongoDB();

try {
  console.log("Seeding sample data for testing...");

  // 1. Find or create employee approver
  let employee = await Employee.findOne();
  if (!employee) {
    employee = await Employee.create({
      first_name: "Admin",
      last_name: "User",
      email: "admin@school.edu",
    });
    console.log("Created fallback employee:", employee.email);
  }

  // 2. Clean up previous test seed (idempotent seed)
  await Promise.all([
    Enrollment.deleteMany({}),
    CourseEnrollment.deleteMany({}),
    Block.deleteMany({}),
    Semester.deleteMany({}),
    Program.deleteMany({}),
    Student.deleteMany({}),
    Course.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  // 3. Create Courses
  const cs101 = await Course.create({
    code: "CS101",
    name: "Introduction to Programming",
    units: 3,
    prerequisites: [],
  });

  const cs102 = await Course.create({
    code: "CS102",
    name: "Data Structures and Algorithms",
    units: 3,
    prerequisites: [cs101._id],
  });

  const math101 = await Course.create({
    code: "MATH101",
    name: "Calculus I",
    units: 3,
    prerequisites: [],
  });

  const eng101 = await Course.create({
    code: "ENG101",
    name: "Purposive Communication",
    units: 3,
    prerequisites: [],
  });

  const cs103 = await Course.create({
    code: "CS103",
    name: "Advanced Computing Workshop",
    units: 3,
    prerequisites: [],
  });

  console.log("Created courses: CS101, CS102, MATH101, ENG101, CS103");

  // 4. Create Programs
  const bscs = await Program.create({
    name: "BS Computer Science",
    major: "Software Engineering",
    courses: [
      { course: cs101._id, year_level: 1 },
      { course: math101._id, year_level: 1 },
      { course: eng101._id, year_level: 1 },
      { course: cs102._id, year_level: 2 },
    ],
  });

  const bsit = await Program.create({
    name: "BS Information Technology",
    major: "Network Administration",
    courses: [
      { course: cs101._id, year_level: 1 },
      { course: eng101._id, year_level: 1 },
    ],
  });

  console.log("Created programs: BS Computer Science, BS Information Technology");

  // 5. Create Semesters
  // Note: CS103 has capacity: 1, enrolled: 1 to demonstrate "Full (0/1 seats)" and disabled state
  const semester1 = await Semester.create({
    semester_term: "1st",
    academic_year: 2026,
    offerings: [
      { course: cs101._id, capacity: 30, enrolled: 1, course_active: true },
      { course: math101._id, capacity: 25, enrolled: 1, course_active: true },
      { course: eng101._id, capacity: 30, enrolled: 1, course_active: true },
      { course: cs102._id, capacity: 20, enrolled: 0, course_active: true },
      { course: cs103._id, capacity: 1, enrolled: 1, course_active: true },
    ],
  });

  const semester2 = await Semester.create({
    semester_term: "2nd",
    academic_year: 2026,
    offerings: [
      { course: cs102._id, capacity: 30, enrolled: 0, course_active: true },
      { course: eng101._id, capacity: 30, enrolled: 0, course_active: true },
    ],
  });

  console.log("Created semesters: 1st Term 2026, 2nd Term 2026");

  // 6. Create Blocks (Sections)
  const block1A = await Block.create({
    semester: semester1._id,
    program: bscs._id,
    major: "Software Engineering",
    section_name: "BSCS-1A",
    courses: [
      { course: cs101._id, schedule: "MWF 9:00-10:00", room: "CL-1" },
      { course: math101._id, schedule: "TTH 10:30-12:00", room: "RM-201" },
      { course: eng101._id, schedule: "MWF 13:00-14:00", room: "RM-102" },
      { course: cs103._id, schedule: "Sat 8:00-11:00", room: "CL-2" },
    ],
    students: [2026000001],
  });

  const block1B = await Block.create({
    semester: semester1._id,
    program: bsit._id,
    major: "Network Administration",
    section_name: "BSIT-1A",
    courses: [
      { course: cs101._id, schedule: "MWF 10:00-11:00", room: "CL-3" },
      { course: eng101._id, schedule: "TTH 13:00-14:30", room: "RM-103" },
    ],
    students: [],
  });

  const block2A = await Block.create({
    semester: semester2._id,
    program: bscs._id,
    major: "Software Engineering",
    section_name: "BSCS-2A",
    courses: [
      { course: cs102._id, schedule: "MWF 9:00-10:00", room: "CL-1" },
      { course: eng101._id, schedule: "TTH 10:30-12:00", room: "RM-201" },
    ],
    students: [],
  });

  const block2B = await Block.create({
    semester: semester2._id,
    program: bsit._id,
    major: "Network Administration",
    section_name: "BSIT-2A",
    courses: [
      { course: eng101._id, schedule: "MWF 13:00-14:00", room: "RM-102" },
    ],
    students: [],
  });

  console.log("Created blocks: BSCS-1A, BSIT-1A (1st Term), BSCS-2A, BSIT-2A (2nd Term)");

  // 7. Create Students
  const alice = await Student.create({
    _id: 2026000001,
    first_name: "Alice",
    middle_name: "Marie",
    last_name: "Santos",
    sex: "Female",
    birth_date: new Date("2005-04-15"),
    address: {
      street: "12 Rizal St",
      barangay: "San Antonio",
      city: "Pasig",
      province: "Metro Manila",
    },
  });

  const bob = await Student.create({
    _id: 2026000002,
    first_name: "Bob",
    middle_name: "Cruz",
    last_name: "Reyes",
    sex: "Male",
    birth_date: new Date("2004-09-20"),
    address: {
      street: "45 Mabini St",
      barangay: "Poblacion",
      city: "Makati",
      province: "Metro Manila",
    },
  });

  await Counter.create({
    _id: "student-2026",
    seq: 2,
  });

  console.log("Created students: 2026000001 (Alice), 2026000002 (Bob)");

  // 8. Create Sample Enrollment (Alice in BSCS-1A)
  const aliceEnrollment = await Enrollment.create({
    student: alice._id,
    approved_by: employee._id,
    program: bscs._id,
    semester: semester1._id,
    block: block1A._id,
    standing_year: 1,
  });

  await CourseEnrollment.create([
    {
      student: alice._id,
      enrollment: aliceEnrollment._id,
      semester: semester1._id,
      course: cs101._id,
      block: block1A._id,
      source: "block",
    },
    {
      student: alice._id,
      enrollment: aliceEnrollment._id,
      semester: semester1._id,
      course: math101._id,
      block: block1A._id,
      source: "block",
    },
    {
      student: alice._id,
      enrollment: aliceEnrollment._id,
      semester: semester1._id,
      course: eng101._id,
      block: block1A._id,
      source: "block",
    },
  ]);

  console.log("Created sample enrollment for Alice Santos (BSCS-1A)");
  console.log("Database seeded successfully!");
} finally {
  await disconnectFromMongoDB();
}
