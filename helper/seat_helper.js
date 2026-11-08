import Semester from "../models/semester_model.js";
import CourseEnrollment from "../models/course_enrollment_model.js";
 
// Claims one seat in a semester offering and creates the matching CourseEnrollment record.
//
// Must be called inside a transaction (pass the session).
// The seat is only taken while "enrolled" is still below the capacity, in a single
// atomic update, so two students can't both take the last seat.
//
// Returns the created CourseEnrollment, or null if the course has no open seat.
export async function claimSeat({ enrollment, courseId, blockId, source, capacity, session }) {
    const claim = await Semester.updateOne(
        {
            _id: enrollment.semester,
            offerings: { $elemMatch: {
                course:        courseId,
                course_active: true,
                enrolled:      { $lt: capacity }
            } }
        },
        { $inc: { "offerings.$.enrolled": 1 } },
        { session }
    )
 
    if (claim.modifiedCount === 0) return null
 
    const [record] = await CourseEnrollment.create([{
        student:    enrollment.student,
        enrollment: enrollment._id,
        semester:   enrollment.semester,
        course:     courseId,
        block:      blockId,
        source
    }], { session })
 
    return record
}
 
