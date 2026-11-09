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
  console.log("Starting database population...");

  // 1. Find existing employee approver (DO NOT DELETE OR ALTER EMPLOYEES)
  const employee = await Employee.findOne();
  if (!employee) {
    throw new Error("No employee found in database! Please create an employee first.");
  }
  console.log(`Using approver employee: ${employee.first_name} ${employee.last_name} (${employee.email})`);

  // 2. Load existing courses (DO NOT DELETE COURSES)
  const coursesList = await Course.find();
  const coursesByCode = new Map();
  for (const c of coursesList) {
    coursesByCode.set(c.code, c);
  }

  function getCourse(code) {
    const c = coursesByCode.get(code);
    if (!c) {
      throw new Error(`Required course with code "${code}" not found in database!`);
    }
    return c;
  }

  // 3. Clean up existing operational data only (Preserve Employee and Course collections)
  console.log("Cleaning up previous enrollments, blocks, students, semesters, and counter...");
  await Promise.all([
    Enrollment.deleteMany({}),
    CourseEnrollment.deleteMany({}),
    Block.deleteMany({}),
    Semester.deleteMany({}),
    Student.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  // 4. Update / configure Programs with courses from 1st to 4th year
  console.log("Updating programs with curriculum courses...");

  const bscsCourses = [
    // Year 1
    { course: getCourse("CC 1")._id, year_level: 1 },
    { course: getCourse("CC 2")._id, year_level: 1 },
    { course: getCourse("CC 3")._id, year_level: 1 },
    { course: getCourse("DS1")._id, year_level: 1 },
    { course: getCourse("HUM 1")._id, year_level: 1 },
    { course: getCourse("ENG 3A")._id, year_level: 1 },
    { course: getCourse("STS 1")._id, year_level: 1 },
    { course: getCourse("SS 1C")._id, year_level: 1 },
    { course: getCourse("SS 1D")._id, year_level: 1 },
    { course: getCourse("PATHFit 1")._id, year_level: 1 },
    { course: getCourse("PATHFit 2")._id, year_level: 1 },

    // Year 2
    { course: getCourse("CC 4")._id, year_level: 2 },
    { course: getCourse("DS2")._id, year_level: 2 },
    { course: getCourse("COAL")._id, year_level: 2 },
    { course: getCourse("CC 6")._id, year_level: 2 },
    { course: getCourse("CC 6L")._id, year_level: 2 },
    { course: getCourse("DAA")._id, year_level: 2 },
    { course: getCourse("ATFL")._id, year_level: 2 },
    { course: getCourse("OOP")._id, year_level: 2 },
    { course: getCourse("DIGDESIGN Lec")._id, year_level: 2 },
    { course: getCourse("DIGDESIGN Lab")._id, year_level: 2 },
    { course: getCourse("GE Elect 2")._id, year_level: 2 },
    { course: getCourse("GE Elect 4")._id, year_level: 2 },
    { course: getCourse("PATHFit 3")._id, year_level: 2 },
    { course: getCourse("PATHFit 4")._id, year_level: 2 },

    // Year 3
    { course: getCourse("SOFTENG")._id, year_level: 3 },
    { course: getCourse("SOFTENG 2")._id, year_level: 3 },
    { course: getCourse("OS")._id, year_level: 3 },
    { course: getCourse("PL")._id, year_level: 3 },
    { course: getCourse("CC 5")._id, year_level: 3 },
    { course: getCourse("SPIC")._id, year_level: 3 },
    { course: getCourse("CSci")._id, year_level: 3 },

    // Year 4
    { course: getCourse("THESIS 1")._id, year_level: 4 },
    { course: getCourse("THESIS 2")._id, year_level: 4 },
    { course: getCourse("IS")._id, year_level: 4 },
    { course: getCourse("PDC")._id, year_level: 4 },
    { course: getCourse("MAS Lec")._id, year_level: 4 },
    { course: getCourse("MAS Lab")._id, year_level: 4 },
    { course: getCourse("OJT")._id, year_level: 4 },
    { course: getCourse("FTS")._id, year_level: 4 },
  ];

  const bsitCourses = [
    // Year 1
    { course: getCourse("CC 1")._id, year_level: 1 },
    { course: getCourse("CC 2")._id, year_level: 1 },
    { course: getCourse("CC 3")._id, year_level: 1 },
    { course: getCourse("HCI")._id, year_level: 1 },
    { course: getCourse("HUM 1")._id, year_level: 1 },
    { course: getCourse("ENG 3A")._id, year_level: 1 },
    { course: getCourse("STS 1")._id, year_level: 1 },
    { course: getCourse("SS 1C")._id, year_level: 1 },
    { course: getCourse("SS 1D")._id, year_level: 1 },
    { course: getCourse("PATHFit 1")._id, year_level: 1 },
    { course: getCourse("PATHFit 2")._id, year_level: 1 },

    // Year 2
    { course: getCourse("CC 4")._id, year_level: 2 },
    { course: getCourse("CCNA1")._id, year_level: 2 },
    { course: getCourse("CCNA2")._id, year_level: 2 },
    { course: getCourse("QM")._id, year_level: 2 },
    { course: getCourse("CC 6")._id, year_level: 2 },
    { course: getCourse("CC 6L")._id, year_level: 2 },
    { course: getCourse("OOP")._id, year_level: 2 },
    { course: getCourse("WEBPROG Lec")._id, year_level: 2 },
    { course: getCourse("WEBPROG Lab")._id, year_level: 2 },
    { course: getCourse("IAS")._id, year_level: 2 },
    { course: getCourse("PT")._id, year_level: 2 },
    { course: getCourse("GE Elect 2")._id, year_level: 2 },
    { course: getCourse("GE Elect 4")._id, year_level: 2 },
    { course: getCourse("PATHFit 3")._id, year_level: 2 },
    { course: getCourse("PATHFit 4")._id, year_level: 2 },
  ];

  let bscs = await Program.findOne({ name: "BS Computer Science" });
  if (bscs) {
    bscs.major = "Software Engineering";
    bscs.courses = bscsCourses;
    await bscs.save();
  } else {
    bscs = await Program.create({
      name: "BS Computer Science",
      major: "Software Engineering",
      courses: bscsCourses,
    });
  }

  let bsit = await Program.findOne({ name: "BS Information Technology" });
  if (bsit) {
    bsit.major = "Network Administration";
    bsit.courses = bsitCourses;
    await bsit.save();
  } else {
    bsit = await Program.create({
      name: "BS Information Technology",
      major: "Network Administration",
      courses: bsitCourses,
    });
  }

  console.log(`Configured BSCS (${bscs.courses.length} courses) & BSIT (${bsit.courses.length} courses)`);

  // 5. Create Semesters (1st Term & 2nd Term 2026)
  // Collect all courses for 1st Term and 2nd Term offerings
  const term1CourseCodes = [
    "CC 1", "CC 2", "HUM 1", "STS 1", "SS 1C", "PATHFit 1",
    "CC 4", "DS2", "COAL", "CC 6", "CC 6L", "GE Elect 2", "PATHFit 3",
    "CCNA1", "QM",
  ];

  const term2CourseCodes = [
    "CC 3", "DS1", "ENG 3A", "SS 1D", "PATHFit 2", "HCI",
    "DAA", "ATFL", "OOP", "DIGDESIGN Lec", "DIGDESIGN Lab", "GE Elect 4", "PATHFit 4",
    "CCNA2", "WEBPROG Lec", "WEBPROG Lab", "IAS", "PT",
  ];

  const semester1 = await Semester.create({
    semester_term: "1st",
    academic_year: 2026,
    offerings: term1CourseCodes.map((code) => ({
      course: getCourse(code)._id,
      capacity: 50,
      enrolled: 0,
      course_active: true,
    })),
  });

  const semester2 = await Semester.create({
    semester_term: "2nd",
    academic_year: 2026,
    offerings: term2CourseCodes.map((code) => ({
      course: getCourse(code)._id,
      capacity: 50,
      enrolled: 0,
      course_active: true,
    })),
  });

  console.log("Created Semesters: 1st Term 2026 and 2nd Term 2026");

  // 6. Define Blocks for both semesters across 1st and 2nd Year
  // Term 1 course plans
  const bscsYear1Term1Courses = [
    { course: getCourse("CC 1")._id, schedule: "MWF 08:00 - 09:00", room: "CL-1" },
    { course: getCourse("CC 2")._id, schedule: "MWF 09:00 - 10:00", room: "CL-2" },
    { course: getCourse("HUM 1")._id, schedule: "MWF 10:00 - 11:00", room: "RM-101" },
    { course: getCourse("STS 1")._id, schedule: "TTH 09:00 - 10:30", room: "RM-102" },
    { course: getCourse("SS 1C")._id, schedule: "TTH 10:30 - 12:00", room: "RM-103" },
    { course: getCourse("PATHFit 1")._id, schedule: "Sat 08:00 - 10:00", room: "GYM-1" },
  ];

  const bscsYear1Term1CoursesB = [
    { course: getCourse("CC 1")._id, schedule: "MWF 11:00 - 12:00", room: "CL-1" },
    { course: getCourse("CC 2")._id, schedule: "MWF 13:00 - 14:00", room: "CL-2" },
    { course: getCourse("HUM 1")._id, schedule: "MWF 14:00 - 15:00", room: "RM-101" },
    { course: getCourse("STS 1")._id, schedule: "TTH 13:00 - 14:30", room: "RM-102" },
    { course: getCourse("SS 1C")._id, schedule: "TTH 14:30 - 16:00", room: "RM-103" },
    { course: getCourse("PATHFit 1")._id, schedule: "Sat 10:00 - 12:00", room: "GYM-1" },
  ];

  const bsitYear1Term1Courses = [
    { course: getCourse("CC 1")._id, schedule: "MWF 08:00 - 09:00", room: "CL-3" },
    { course: getCourse("CC 2")._id, schedule: "MWF 09:00 - 10:00", room: "CL-4" },
    { course: getCourse("HUM 1")._id, schedule: "MWF 10:00 - 11:00", room: "RM-201" },
    { course: getCourse("STS 1")._id, schedule: "TTH 09:00 - 10:30", room: "RM-202" },
    { course: getCourse("SS 1C")._id, schedule: "TTH 10:30 - 12:00", room: "RM-203" },
    { course: getCourse("PATHFit 1")._id, schedule: "Sat 08:00 - 10:00", room: "GYM-2" },
  ];

  const bsitYear1Term1CoursesB = [
    { course: getCourse("CC 1")._id, schedule: "MWF 11:00 - 12:00", room: "CL-3" },
    { course: getCourse("CC 2")._id, schedule: "MWF 13:00 - 14:00", room: "CL-4" },
    { course: getCourse("HUM 1")._id, schedule: "MWF 14:00 - 15:00", room: "RM-201" },
    { course: getCourse("STS 1")._id, schedule: "TTH 13:00 - 14:30", room: "RM-202" },
    { course: getCourse("SS 1C")._id, schedule: "TTH 14:30 - 16:00", room: "RM-203" },
    { course: getCourse("PATHFit 1")._id, schedule: "Sat 10:00 - 12:00", room: "GYM-2" },
  ];

  const bscsYear2Term1Courses = [
    { course: getCourse("CC 4")._id, schedule: "MWF 08:00 - 09:00", room: "CL-1" },
    { course: getCourse("DS2")._id, schedule: "MWF 09:00 - 10:00", room: "RM-301" },
    { course: getCourse("COAL")._id, schedule: "MWF 10:00 - 11:00", room: "CL-2" },
    { course: getCourse("CC 6")._id, schedule: "TTH 08:30 - 10:00", room: "RM-302" },
    { course: getCourse("CC 6L")._id, schedule: "TTH 10:00 - 11:30", room: "CL-3" },
    { course: getCourse("GE Elect 2")._id, schedule: "TTH 13:00 - 14:30", room: "RM-303" },
    { course: getCourse("PATHFit 3")._id, schedule: "Sat 08:00 - 10:00", room: "GYM-1" },
  ];

  const bscsYear2Term1CoursesB = [
    { course: getCourse("CC 4")._id, schedule: "MWF 11:00 - 12:00", room: "CL-1" },
    { course: getCourse("DS2")._id, schedule: "MWF 13:00 - 14:00", room: "RM-301" },
    { course: getCourse("COAL")._id, schedule: "MWF 14:00 - 15:00", room: "CL-2" },
    { course: getCourse("CC 6")._id, schedule: "TTH 13:00 - 14:30", room: "RM-302" },
    { course: getCourse("CC 6L")._id, schedule: "TTH 14:30 - 16:00", room: "CL-3" },
    { course: getCourse("GE Elect 2")._id, schedule: "TTH 16:00 - 17:30", room: "RM-303" },
    { course: getCourse("PATHFit 3")._id, schedule: "Sat 10:00 - 12:00", room: "GYM-1" },
  ];

  const bsitYear2Term1Courses = [
    { course: getCourse("CC 4")._id, schedule: "MWF 08:00 - 09:00", room: "CL-4" },
    { course: getCourse("CCNA1")._id, schedule: "MWF 09:00 - 10:30", room: "NET-LAB" },
    { course: getCourse("QM")._id, schedule: "MWF 11:00 - 12:00", room: "RM-204" },
    { course: getCourse("CC 6")._id, schedule: "TTH 08:30 - 10:00", room: "RM-205" },
    { course: getCourse("CC 6L")._id, schedule: "TTH 10:00 - 11:30", room: "CL-4" },
    { course: getCourse("GE Elect 2")._id, schedule: "TTH 13:00 - 14:30", room: "RM-206" },
    { course: getCourse("PATHFit 3")._id, schedule: "Sat 08:00 - 10:00", room: "GYM-2" },
  ];

  const bsitYear2Term1CoursesB = [
    { course: getCourse("CC 4")._id, schedule: "MWF 13:00 - 14:00", room: "CL-4" },
    { course: getCourse("CCNA1")._id, schedule: "MWF 14:00 - 15:30", room: "NET-LAB" },
    { course: getCourse("QM")._id, schedule: "MWF 16:00 - 17:00", room: "RM-204" },
    { course: getCourse("CC 6")._id, schedule: "TTH 13:00 - 14:30", room: "RM-205" },
    { course: getCourse("CC 6L")._id, schedule: "TTH 14:30 - 16:00", room: "CL-4" },
    { course: getCourse("GE Elect 2")._id, schedule: "TTH 16:00 - 17:30", room: "RM-206" },
    { course: getCourse("PATHFit 3")._id, schedule: "Sat 10:00 - 12:00", room: "GYM-2" },
  ];

  // Term 2 course plans
  const bscsYear1Term2Courses = [
    { course: getCourse("CC 3")._id, schedule: "MWF 08:00 - 09:00", room: "CL-1" },
    { course: getCourse("DS1")._id, schedule: "MWF 09:00 - 10:00", room: "RM-101" },
    { course: getCourse("ENG 3A")._id, schedule: "MWF 10:00 - 11:00", room: "RM-102" },
    { course: getCourse("SS 1D")._id, schedule: "TTH 09:00 - 10:30", room: "RM-103" },
    { course: getCourse("PATHFit 2")._id, schedule: "Sat 08:00 - 10:00", room: "GYM-1" },
  ];

  const bscsYear1Term2CoursesB = [
    { course: getCourse("CC 3")._id, schedule: "MWF 11:00 - 12:00", room: "CL-1" },
    { course: getCourse("DS1")._id, schedule: "MWF 13:00 - 14:00", room: "RM-101" },
    { course: getCourse("ENG 3A")._id, schedule: "MWF 14:00 - 15:00", room: "RM-102" },
    { course: getCourse("SS 1D")._id, schedule: "TTH 13:00 - 14:30", room: "RM-103" },
    { course: getCourse("PATHFit 2")._id, schedule: "Sat 10:00 - 12:00", room: "GYM-1" },
  ];

  const bsitYear1Term2Courses = [
    { course: getCourse("CC 3")._id, schedule: "MWF 08:00 - 09:00", room: "CL-3" },
    { course: getCourse("HCI")._id, schedule: "MWF 09:00 - 10:00", room: "RM-201" },
    { course: getCourse("ENG 3A")._id, schedule: "MWF 10:00 - 11:00", room: "RM-202" },
    { course: getCourse("SS 1D")._id, schedule: "TTH 09:00 - 10:30", room: "RM-203" },
    { course: getCourse("PATHFit 2")._id, schedule: "Sat 08:00 - 10:00", room: "GYM-2" },
  ];

  const bsitYear1Term2CoursesB = [
    { course: getCourse("CC 3")._id, schedule: "MWF 11:00 - 12:00", room: "CL-3" },
    { course: getCourse("HCI")._id, schedule: "MWF 13:00 - 14:00", room: "RM-201" },
    { course: getCourse("ENG 3A")._id, schedule: "MWF 14:00 - 15:00", room: "RM-202" },
    { course: getCourse("SS 1D")._id, schedule: "TTH 13:00 - 14:30", room: "RM-203" },
    { course: getCourse("PATHFit 2")._id, schedule: "Sat 10:00 - 12:00", room: "GYM-2" },
  ];

  const bscsYear2Term2Courses = [
    { course: getCourse("DAA")._id, schedule: "MWF 08:00 - 09:00", room: "RM-301" },
    { course: getCourse("ATFL")._id, schedule: "MWF 09:00 - 10:00", room: "RM-302" },
    { course: getCourse("OOP")._id, schedule: "MWF 10:00 - 11:00", room: "CL-1" },
    { course: getCourse("DIGDESIGN Lec")._id, schedule: "TTH 08:30 - 10:00", room: "RM-303" },
    { course: getCourse("DIGDESIGN Lab")._id, schedule: "TTH 10:00 - 11:30", room: "HW-LAB" },
    { course: getCourse("GE Elect 4")._id, schedule: "TTH 13:00 - 14:30", room: "RM-304" },
    { course: getCourse("PATHFit 4")._id, schedule: "Sat 08:00 - 10:00", room: "GYM-1" },
  ];

  const bscsYear2Term2CoursesB = [
    { course: getCourse("DAA")._id, schedule: "MWF 11:00 - 12:00", room: "RM-301" },
    { course: getCourse("ATFL")._id, schedule: "MWF 13:00 - 14:00", room: "RM-302" },
    { course: getCourse("OOP")._id, schedule: "MWF 14:00 - 15:00", room: "CL-1" },
    { course: getCourse("DIGDESIGN Lec")._id, schedule: "TTH 13:00 - 14:30", room: "RM-303" },
    { course: getCourse("DIGDESIGN Lab")._id, schedule: "TTH 14:30 - 16:00", room: "HW-LAB" },
    { course: getCourse("GE Elect 4")._id, schedule: "TTH 16:00 - 17:30", room: "RM-304" },
    { course: getCourse("PATHFit 4")._id, schedule: "Sat 10:00 - 12:00", room: "GYM-1" },
  ];

  const bsitYear2Term2Courses = [
    { course: getCourse("CCNA2")._id, schedule: "MWF 08:00 - 09:30", room: "NET-LAB" },
    { course: getCourse("OOP")._id, schedule: "MWF 10:00 - 11:00", room: "CL-3" },
    { course: getCourse("WEBPROG Lec")._id, schedule: "MWF 11:00 - 12:00", room: "RM-204" },
    { course: getCourse("WEBPROG Lab")._id, schedule: "MWF 13:00 - 14:30", room: "CL-4" },
    { course: getCourse("IAS")._id, schedule: "TTH 08:30 - 10:00", room: "RM-205" },
    { course: getCourse("PT")._id, schedule: "TTH 10:00 - 11:30", room: "RM-206" },
    { course: getCourse("GE Elect 4")._id, schedule: "TTH 13:00 - 14:30", room: "RM-207" },
    { course: getCourse("PATHFit 4")._id, schedule: "Sat 08:00 - 10:00", room: "GYM-2" },
  ];

  const bsitYear2Term2CoursesB = [
    { course: getCourse("CCNA2")._id, schedule: "MWF 13:00 - 14:30", room: "NET-LAB" },
    { course: getCourse("OOP")._id, schedule: "MWF 14:30 - 15:30", room: "CL-3" },
    { course: getCourse("WEBPROG Lec")._id, schedule: "MWF 15:30 - 16:30", room: "RM-204" },
    { course: getCourse("WEBPROG Lab")._id, schedule: "MWF 16:30 - 18:00", room: "CL-4" },
    { course: getCourse("IAS")._id, schedule: "TTH 13:00 - 14:30", room: "RM-205" },
    { course: getCourse("PT")._id, schedule: "TTH 14:30 - 16:00", room: "RM-206" },
    { course: getCourse("GE Elect 4")._id, schedule: "TTH 16:00 - 17:30", room: "RM-207" },
    { course: getCourse("PATHFit 4")._id, schedule: "Sat 10:00 - 12:00", room: "GYM-2" },
  ];

  // Insert all blocks
  const blocksData = [
    // --- 1st Term Blocks ---
    { semester: semester1._id, program: bscs._id, major: "Software Engineering", year_level: 1, section_name: "BSCS-1A", courses: bscsYear1Term1Courses, students: [] },
    { semester: semester1._id, program: bscs._id, major: "Software Engineering", year_level: 1, section_name: "BSCS-1B", courses: bscsYear1Term1CoursesB, students: [] },
    { semester: semester1._id, program: bsit._id, major: "Network Administration", year_level: 1, section_name: "BSIT-1A", courses: bsitYear1Term1Courses, students: [] },
    { semester: semester1._id, program: bsit._id, major: "Network Administration", year_level: 1, section_name: "BSIT-1B", courses: bsitYear1Term1CoursesB, students: [] },
    { semester: semester1._id, program: bscs._id, major: "Software Engineering", year_level: 2, section_name: "BSCS-2A", courses: bscsYear2Term1Courses, students: [] },
    { semester: semester1._id, program: bscs._id, major: "Software Engineering", year_level: 2, section_name: "BSCS-2B", courses: bscsYear2Term1CoursesB, students: [] },
    { semester: semester1._id, program: bsit._id, major: "Network Administration", year_level: 2, section_name: "BSIT-2A", courses: bsitYear2Term1Courses, students: [] },
    { semester: semester1._id, program: bsit._id, major: "Network Administration", year_level: 2, section_name: "BSIT-2B", courses: bsitYear2Term1CoursesB, students: [] },

    // --- 2nd Term Blocks ---
    { semester: semester2._id, program: bscs._id, major: "Software Engineering", year_level: 1, section_name: "BSCS-1A", courses: bscsYear1Term2Courses, students: [] },
    { semester: semester2._id, program: bscs._id, major: "Software Engineering", year_level: 1, section_name: "BSCS-1B", courses: bscsYear1Term2CoursesB, students: [] },
    { semester: semester2._id, program: bsit._id, major: "Network Administration", year_level: 1, section_name: "BSIT-1A", courses: bsitYear1Term2Courses, students: [] },
    { semester: semester2._id, program: bsit._id, major: "Network Administration", year_level: 1, section_name: "BSIT-1B", courses: bsitYear1Term2CoursesB, students: [] },
    { semester: semester2._id, program: bscs._id, major: "Software Engineering", year_level: 2, section_name: "BSCS-2A", courses: bscsYear2Term2Courses, students: [] },
    { semester: semester2._id, program: bscs._id, major: "Software Engineering", year_level: 2, section_name: "BSCS-2B", courses: bscsYear2Term2CoursesB, students: [] },
    { semester: semester2._id, program: bsit._id, major: "Network Administration", year_level: 2, section_name: "BSIT-2A", courses: bsitYear2Term2Courses, students: [] },
    { semester: semester2._id, program: bsit._id, major: "Network Administration", year_level: 2, section_name: "BSIT-2B", courses: bsitYear2Term2CoursesB, students: [] },
  ];

  const createdBlocks = await Block.insertMany(blocksData);
  console.log(`Created ${createdBlocks.length} blocks across 1st and 2nd Year for both programs and terms.`);

  // Block lookup helpers
  function findBlock(semesterId, sectionName) {
    return createdBlocks.find(
      (b) => b.semester.toString() === semesterId.toString() && b.section_name === sectionName
    );
  }

  // 7. Create 32 Students
  console.log("Creating 32 students...");
  const rawStudents = [
    // Year 1 BSCS Group A
    { first_name: "Juan", middle_name: "Santos", last_name: "Dela Cruz", sex: "Male", birth_date: "2006-03-15", street: "12 Rizal St", barangay: "San Antonio", city: "Pasig", province: "Metro Manila" },
    { first_name: "Maria", middle_name: "Clara", last_name: "Reyes", sex: "Female", birth_date: "2006-05-20", street: "45 Mabini St", barangay: "Poblacion", city: "Makati", province: "Metro Manila" },
    { first_name: "Carlo", middle_name: "Aquino", last_name: "Mendoza", sex: "Male", birth_date: "2005-11-10", street: "88 Katipunan Ave", barangay: "Loyola Heights", city: "Quezon City", province: "Metro Manila" },
    { first_name: "Bea", middle_name: "Rose", last_name: "Santiago", sex: "Female", birth_date: "2006-01-25", street: "7 Luna St", barangay: "Bagong Ilog", city: "Pasig", province: "Metro Manila" },

    // Year 1 BSCS Group B
    { first_name: "Miguel", middle_name: "Luis", last_name: "Rodriguez", sex: "Male", birth_date: "2006-08-14", street: "23 Taft Ave", barangay: "Malate", city: "Manila", province: "Metro Manila" },
    { first_name: "Kathryn", middle_name: "Bernadette", last_name: "Manuel", sex: "Female", birth_date: "2006-04-12", street: "101 EDSA", barangay: "Wack-Wack", city: "Mandaluyong", province: "Metro Manila" },
    { first_name: "Daniel", middle_name: "John", last_name: "Padilla", sex: "Male", birth_date: "2005-12-05", street: "15 Shaw Blvd", barangay: "Kapitolyo", city: "Pasig", province: "Metro Manila" },
    { first_name: "Liza", middle_name: "Mae", last_name: "Soberano", sex: "Female", birth_date: "2006-02-18", street: "67 Commonwealth Ave", barangay: "Batasan", city: "Quezon City", province: "Metro Manila" },

    // Year 1 BSIT Group A
    { first_name: "Enrique", middle_name: "Carlos", last_name: "Gil", sex: "Male", birth_date: "2006-07-22", street: "34 Ortigas Ave", barangay: "Greenhills", city: "San Juan", province: "Metro Manila" },
    { first_name: "Nadine", middle_name: "Alexis", last_name: "Lustre", sex: "Female", birth_date: "2006-09-30", street: "50 Boni Ave", barangay: "Plainview", city: "Mandaluyong", province: "Metro Manila" },
    { first_name: "James", middle_name: "Robert", last_name: "Reid", sex: "Male", birth_date: "2005-10-15", street: "12 Aurora Blvd", barangay: "Kaunlaran", city: "Quezon City", province: "Metro Manila" },
    { first_name: "Joshua", middle_name: "David", last_name: "Garcia", sex: "Male", birth_date: "2006-06-08", street: "89 Buendia Ave", barangay: "San Lorenzo", city: "Makati", province: "Metro Manila" },

    // Year 1 BSIT Group B
    { first_name: "Julia", middle_name: "Francesca", last_name: "Barretto", sex: "Female", birth_date: "2006-03-28", street: "77 Ayala Ave", barangay: "Bel-Air", city: "Makati", province: "Metro Manila" },
    { first_name: "Alden", middle_name: "Richard", last_name: "Faulkerson", sex: "Male", birth_date: "2005-09-02", street: "14 Marcos Highway", barangay: "Santolan", city: "Pasig", province: "Metro Manila" },
    { first_name: "Maine", middle_name: "Capili", last_name: "Mendoza", sex: "Female", birth_date: "2006-03-03", street: "22 C5 Road", barangay: "Ugong", city: "Pasig", province: "Metro Manila" },
    { first_name: "Gerald", middle_name: "Randy", last_name: "Anderson", sex: "Male", birth_date: "2005-08-19", street: "9 Timog Ave", barangay: "South Triangle", city: "Quezon City", province: "Metro Manila" },

    // Year 2 BSCS Group A
    { first_name: "Kim", middle_name: "Chiu", last_name: "Velasco", sex: "Female", birth_date: "2005-04-19", street: "44 España Blvd", barangay: "Sampaloc", city: "Manila", province: "Metro Manila" },
    { first_name: "Xian", middle_name: "Paul", last_name: "Lim", sex: "Male", birth_date: "2004-07-12", street: "31 Quezon Ave", barangay: "West Triangle", city: "Quezon City", province: "Metro Manila" },
    { first_name: "Sarah", middle_name: "Asher", last_name: "Geronimo", sex: "Female", birth_date: "2005-07-25", street: "19 Pioneer St", barangay: "Barangka Ilaya", city: "Mandaluyong", province: "Metro Manila" },
    { first_name: "Matteo", middle_name: "Fernan", last_name: "Guidicelli", sex: "Male", birth_date: "2004-03-26", street: "55 Kalayaan Ave", barangay: "Central", city: "Quezon City", province: "Metro Manila" },

    // Year 2 BSCS Group B
    { first_name: "Anne", middle_name: "Ojales", last_name: "Curtis", sex: "Female", birth_date: "2005-02-17", street: "90 Bonifacio High", barangay: "Fort Bonifacio", city: "Taguig", province: "Metro Manila" },
    { first_name: "Dingdong", middle_name: "Gonzalez", last_name: "Dantes", sex: "Male", birth_date: "2004-08-02", street: "78 Chino Roces", barangay: "Pio del Pilar", city: "Makati", province: "Metro Manila" },
    { first_name: "Marian", middle_name: "Rivera", last_name: "Gracia", sex: "Female", birth_date: "2005-08-12", street: "38 Gil Puyat", barangay: "San Antonio", city: "Makati", province: "Metro Manila" },
    { first_name: "Jericho", middle_name: "Vibar", last_name: "Rosales", sex: "Male", birth_date: "2004-09-22", street: "62 Anonas St", barangay: "Quirino", city: "Quezon City", province: "Metro Manila" },

    // Year 2 BSIT Group A
    { first_name: "Heart", middle_name: "Bernadette", last_name: "Evangelista", sex: "Female", birth_date: "2005-02-14", street: "18 Forbes Park", barangay: "Forbes Park", city: "Makati", province: "Metro Manila" },
    { first_name: "Piolo", middle_name: "Jose", last_name: "Pascual", sex: "Male", birth_date: "2004-01-12", street: "29 White Plains", barangay: "White Plains", city: "Quezon City", province: "Metro Manila" },
    { first_name: "Dennis", middle_name: "Ho", last_name: "Trillo", sex: "Male", birth_date: "2004-05-12", street: "53 Tomas Morato", barangay: "Kristong Hari", city: "Quezon City", province: "Metro Manila" },
    { first_name: "Jennylyn", middle_name: "Anne", last_name: "Mercado", sex: "Female", birth_date: "2005-05-15", street: "82 Visayas Ave", barangay: "Vasra", city: "Quezon City", province: "Metro Manila" },

    // Year 2 BSIT Group B
    { first_name: "Coco", middle_name: "Nacianceno", last_name: "Martin", sex: "Male", birth_date: "2004-11-01", street: "71 Mindanao Ave", barangay: "Project 6", city: "Quezon City", province: "Metro Manila" },
    { first_name: "Angelica", middle_name: "David", last_name: "Panganiban", sex: "Female", birth_date: "2005-11-04", street: "16 Congressional", barangay: "Bahay Toro", city: "Quezon City", province: "Metro Manila" },
    { first_name: "John Lloyd", middle_name: "Espidol", last_name: "Cruz", sex: "Male", birth_date: "2004-06-24", street: "95 Katipunan", barangay: "Blue Ridge", city: "Quezon City", province: "Metro Manila" },
    { first_name: "Angel", middle_name: "Colmenares", last_name: "Locsin", sex: "Female", birth_date: "2005-04-23", street: "40 E. Rodriguez", barangay: "Doña Imelda", city: "Quezon City", province: "Metro Manila" },
  ];

  const students = [];
  for (let i = 0; i < rawStudents.length; i++) {
    const s = rawStudents[i];
    const studentId = 2026000001 + i;
    const doc = await Student.create({
      _id: studentId,
      first_name: s.first_name,
      middle_name: s.middle_name,
      last_name: s.last_name,
      sex: s.sex,
      birth_date: new Date(s.birth_date),
      address: {
        street: s.street,
        barangay: s.barangay,
        city: s.city,
        province: s.province,
      },
    });
    students.push(doc);
  }

  // Update ID counter so next generated student is 2026000033
  await Counter.create({
    _id: "student-2026",
    seq: students.length,
  });

  console.log(`Created ${students.length} students (ID 2026000001 to ${2026000000 + students.length}). Counter set to ${students.length}.`);

  // 8. Enroll Students into Blocks (1st Term 2026)
  // Distribution: 4 students per block across the 8 Term-1 blocks
  const studentEnrollmentPlan = [
    // Year 1 BSCS
    { indices: [0, 1, 2, 3], blockName: "BSCS-1A", program: bscs, year: 1 },
    { indices: [4, 5, 6, 7], blockName: "BSCS-1B", program: bscs, year: 1 },

    // Year 1 BSIT
    { indices: [8, 9, 10, 11], blockName: "BSIT-1A", program: bsit, year: 1 },
    { indices: [12, 13, 14, 15], blockName: "BSIT-1B", program: bsit, year: 1 },

    // Year 2 BSCS
    { indices: [16, 17, 18, 19], blockName: "BSCS-2A", program: bscs, year: 2 },
    { indices: [20, 21, 22, 23], blockName: "BSCS-2B", program: bscs, year: 2 },

    // Year 2 BSIT
    { indices: [24, 25, 26, 27], blockName: "BSIT-2A", program: bsit, year: 2 },
    { indices: [28, 29, 30, 31], blockName: "BSIT-2B", program: bsit, year: 2 },
  ];

  const enrollmentsToCreate = [];
  const courseEnrollmentsToCreate = [];
  const blockStudentUpdates = new Map(); // blockId -> Array of studentIds
  const courseCountMapTerm1 = new Map(); // courseId string -> count

  for (const plan of studentEnrollmentPlan) {
    const block = findBlock(semester1._id, plan.blockName);
    if (!block) throw new Error(`Block ${plan.blockName} not found!`);

    const studentList = [];

    for (const idx of plan.indices) {
      const student = students[idx];
      studentList.push(student._id);

      enrollmentsToCreate.push({
        student: student._id,
        approved_by: employee._id,
        program: plan.program._id,
        semester: semester1._id,
        block: block._id,
        standing_year: plan.year,
        // Course enrollments will be linked after insertion
        _tempBlockCourses: block.courses,
      });

      for (const item of block.courses) {
        const cId = item.course.toString();
        courseCountMapTerm1.set(cId, (courseCountMapTerm1.get(cId) || 0) + 1);
      }
    }

    blockStudentUpdates.set(block._id.toString(), studentList);
  }

  // Insert enrollments
  console.log(`Creating ${enrollmentsToCreate.length} enrollments in 1st Term 2026...`);
  for (const e of enrollmentsToCreate) {
    const tempCourses = e._tempBlockCourses;
    delete e._tempBlockCourses;

    const createdEnrollment = await Enrollment.create(e);

    for (const item of tempCourses) {
      courseEnrollmentsToCreate.push({
        student: createdEnrollment.student,
        enrollment: createdEnrollment._id,
        semester: createdEnrollment.semester,
        course: item.course,
        block: createdEnrollment.block,
        source: "block",
      });
    }
  }

  // Insert course enrollments
  await CourseEnrollment.insertMany(courseEnrollmentsToCreate);
  console.log(`Created ${courseEnrollmentsToCreate.length} CourseEnrollment records.`);

  // Update blocks with their students
  for (const [blockId, studentIds] of blockStudentUpdates.entries()) {
    await Block.findByIdAndUpdate(blockId, { students: studentIds });
  }

  // Update Semester 1 offerings enrolled count
  for (const offering of semester1.offerings) {
    const count = courseCountMapTerm1.get(offering.course.toString()) || 0;
    offering.enrolled = count;
  }
  await semester1.save();

  console.log("Updated blocks and semester 1 course offerings with enrolled counts.");

  // Also enroll a few students into 2nd Term 2026 for rich cross-semester data
  console.log("Enrolling sample students into 2nd Term 2026...");
  const term2EnrollmentPlan = [
    { student: students[0], blockName: "BSCS-1A", program: bscs, year: 1 },
    { student: students[1], blockName: "BSCS-1A", program: bscs, year: 1 },
    { student: students[8], blockName: "BSIT-1A", program: bsit, year: 1 },
    { student: students[9], blockName: "BSIT-1A", program: bsit, year: 1 },
    { student: students[16], blockName: "BSCS-2A", program: bscs, year: 2 },
    { student: students[17], blockName: "BSCS-2A", program: bscs, year: 2 },
    { student: students[24], blockName: "BSIT-2A", program: bsit, year: 2 },
    { student: students[25], blockName: "BSIT-2A", program: bsit, year: 2 },
  ];

  const term2CourseEnrollments = [];
  const term2BlockStudents = new Map();
  const courseCountMapTerm2 = new Map();

  for (const item of term2EnrollmentPlan) {
    const block = findBlock(semester2._id, item.blockName);
    const createdEnrollment = await Enrollment.create({
      student: item.student._id,
      approved_by: employee._id,
      program: item.program._id,
      semester: semester2._id,
      block: block._id,
      standing_year: item.year,
    });

    const currentList = term2BlockStudents.get(block._id.toString()) || [];
    currentList.push(item.student._id);
    term2BlockStudents.set(block._id.toString(), currentList);

    for (const bc of block.courses) {
      term2CourseEnrollments.push({
        student: item.student._id,
        enrollment: createdEnrollment._id,
        semester: semester2._id,
        course: bc.course,
        block: block._id,
        source: "block",
      });

      const cId = bc.course.toString();
      courseCountMapTerm2.set(cId, (courseCountMapTerm2.get(cId) || 0) + 1);
    }
  }

  await CourseEnrollment.insertMany(term2CourseEnrollments);

  for (const [blockId, studentIds] of term2BlockStudents.entries()) {
    await Block.findByIdAndUpdate(blockId, { students: studentIds });
  }

  for (const offering of semester2.offerings) {
    const count = courseCountMapTerm2.get(offering.course.toString()) || 0;
    offering.enrolled = count;
  }
  await semester2.save();

  console.log("2nd Term 2026 enrollments created and semester offerings updated.");

  // Summary
  console.log("\n=================== SEED SUMMARY ===================");
  console.log(`Programs: 2 (BSCS & BSIT, fully mapped with courses)`);
  console.log(`Courses preserved in DB: ${coursesList.length}`);
  console.log(`Semesters: 2 (1st & 2nd Term 2026)`);
  console.log(`Blocks: ${blocksData.length} (across Year 1 & Year 2 for both programs)`);
  console.log(`Students: ${students.length}`);
  console.log(`Enrollments: ${enrollmentsToCreate.length + term2EnrollmentPlan.length}`);
  console.log(`Course Enrollments: ${courseEnrollmentsToCreate.length + term2CourseEnrollments.length}`);
  console.log("Database successfully populated with abundant, realistic data!");
} catch (error) {
  console.error("Population error:", error);
  throw error;
} finally {
  await disconnectFromMongoDB();
}
