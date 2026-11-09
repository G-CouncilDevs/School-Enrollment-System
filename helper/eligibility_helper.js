import CourseRecord from "../models/course_record_model.js";

/**
 * Given a list of Course documents (prerequisites populated) and a semester's
 * offerings Map, determine which courses a student can and cannot enroll in.
 *
 * @param {object[]} courses       - Course docs with prerequisites populated
 * @param {number|null} studentId  - Existing student ID; null for brand-new students
 * @param {Map<string, object>} offerings - Map of courseId string → semester offering
 * @returns {Promise<{ eligible: object[], skipped: object[] }>}
 */
export async function filterEligibleCourses(courses, studentId, offerings) {
    const passed = new Set(
        studentId !== null
            ? (await CourseRecord.distinct("course", { student: studentId, status: "passed" })).map(String)
            : []
    );

    const eligible = [];
    const skipped  = [];

    for (const course of courses) {
        const offering = offerings.get(String(course._id));
        const info = { course: course._id, code: course.code, name: course.name };

        if (!offering || !offering.course_active) {
            skipped.push({ ...info, reason: "not_open" });
            continue;
        }
        if (passed.has(String(course._id))) {
            skipped.push({ ...info, reason: "already_passed" });
            continue;
        }
        const missing = course.prerequisites.filter((p) => !passed.has(String(p._id)));
        if (missing.length > 0) {
            skipped.push({
                ...info,
                reason: "missing_prerequisites",
                missing_prerequisites: missing.map((p) => ({ _id: p._id, code: p.code, name: p.name })),
            });
            continue;
        }
        eligible.push({ course, capacity: offering.capacity });
    }

    return { eligible, skipped };
}
