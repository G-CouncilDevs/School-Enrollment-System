import mongoose from "mongoose";
import CourseEnrollment from "../models/course_enrollment_model.js";
import Enrollment from "../models/enrollment_model.js";
import Semester from "../models/semester_model.js";
import Block from "../models/block_model.js";
import Course from "../models/course_model.js";
import CourseRecord from "../models/course_record_model.js";
import { claimSeat } from "../helper/seat_helper.js";
import { isId } from "../utils/validate.js";
import { parsePage } from "../utils/pagination.js";
// Imported so populate() can find the model:
import "../models/student_model.js";
 
const SOURCES = ["block", "prerequisite"]

export async function getCourseEnrollments(req, res, next) {
    try{
        const filter = {}
 
        if (req.query.student !== undefined) {
            const student = Number(req.query.student)
            if (!Number.isInteger(student)) {
                return res.status(400).json({error: "student must be a number"})
            }
            filter.student = student
        }
 
        for (const field of ["enrollment", "semester", "course", "block"]) {
            if (req.query[field] !== undefined) {
                if (!isId(req.query[field])) {
                    return res.status(400).json({error: `Invalid ${field} id`})
                }
                filter[field] = req.query[field]
            }
        }
 
        if (req.query.source !== undefined) {
            if (!SOURCES.includes(req.query.source)) {
                return res.status(400).json({error: `source must be one of: ${SOURCES.join(", ")}`})
            }
            filter.source = req.query.source
        }
 
        const { page, limit } = parsePage(req.query)
 
        const [courseEnrollments, total] = await Promise.all([
            CourseEnrollment.find(filter)
                .sort({ _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate({ path: "student", select: "first_name middle_name last_name" })
                .populate({ path: "course",  select: "code name" }),
            CourseEnrollment.countDocuments(filter)
        ])
 
        res.status(200).json({ page, limit, total, courseEnrollments })
    }
    catch(err){
        next(err)
    }
}
 
// ---------- GET ONE (read-only) ----------
// GET /course-enrollments/:id
export async function getCourseEnrollment(req, res, next) {
    try{
        const id = req.params.id
        if (!isId(id)) return res.status(400).json({error: "Invalid course enrollment id"})
 
        const record = await CourseEnrollment.findById(id)
            .populate({ path: "student",  select: "first_name middle_name last_name" })
            .populate({ path: "course",   select: "code name units" })
            .populate({ path: "block",    select: "section_name" })
            .populate({ path: "semester", select: "semester_term academic_year" })
        if (!record) return res.status(404).json({error: "Course enrollment not found"})
 
        res.status(200).json(record)
    }
    catch(err){
        next(err)
    }
}
 
//POST (add a course to an existing enrollment)
// Body: { enrollment, course, block }
// Checks prerequisites and claims a seat. A course taught in the enrollment's own block
// is source "block"; one taken through any other block (for example a missing
// prerequisite) is source "prerequisite".
// This is the only way to create a CourseEnrollment directly.
export async function addCourse(req, res, next) {
    const session = await mongoose.startSession()
    try{
        const { enrollment: enrollmentId, course: courseId, block: blockId } = req.body
 
        for (const [name, value] of [["enrollment", enrollmentId], ["course", courseId], ["block", blockId]]) {
            if (!isId(value)) return res.status(400).json({error: `Invalid ${name} id`})
        }
 
        const enrollment = await Enrollment.findById(enrollmentId)
        if (!enrollment) return res.status(404).json({error: "Enrollment not found"})
 
        const course = await Course.findById(courseId)
        if (!course) return res.status(400).json({error: "Course does not exist"})
 
        // The block must belong to the enrollment's semester and teach this course
        const block = await Block.findById(blockId)
        if (!block) return res.status(400).json({error: "Block does not exist"})
        if (String(block.semester) !== String(enrollment.semester)) {
            return res.status(400).json({error: "That block is not in the enrollment's semester"})
        }
        if (!block.courses.some(c => String(c.course) === String(courseId))) {
            return res.status(400).json({error: "That block does not teach this course"})
        }
 
        // The course must be open this semester
        const semester = await Semester.findById(enrollment.semester)
        const offering = semester?.offerings.find(o => String(o.course) === String(courseId))
        if (!offering || !offering.course_active) {
            return res.status(409).json({error: "This course is not open this semester"})
        }
 
        // Already passed? Then there is nothing to take again
        if (await CourseRecord.exists({ student: enrollment.student, course: courseId, status: "passed" })) {
            return res.status(409).json({error: "The student has already passed this course"})
        }
 
        // Prerequisites: every one must be passed
        if (course.prerequisites.length > 0) {
            const passed = (await CourseRecord.distinct("course", {
                student: enrollment.student,
                status:  "passed",
                course:  { $in: course.prerequisites }
            })).map(String)
 
            const missing = course.prerequisites.filter(p => !passed.includes(String(p)))
            if (missing.length > 0) {
                const missingCourses = await Course.find({ _id: { $in: missing } }).select("code name")
                return res.status(409).json({
                    error: "Missing prerequisites",
                    missing_prerequisites: missingCourses
                })
            }
        }
 
        // Claim a seat and create the record in one transaction
                // Claim a seat and create the record in one transaction
        let created = null
        await session.withTransaction(async () => {
            const source = String(block._id) === String(enrollment.block) ? "block" : "prerequisite"
            created = await claimSeat({
                enrollment,
                courseId,
                blockId:  block._id,
                source,
                capacity: offering.capacity,
                session
            })
        })

        if (!created) return res.status(409).json({error: "No open seat for this course"})
        res.status(201).json(created)
    }
    catch(err){
        if (err.code === 11000) {
            return res.status(409).json({error: "The student is already taking this course this semester"})
        }
        next(err)
    }
    finally{
        await session.endSession()
    }
}

 
// ---------- DROP A COURSE ----------
// DELETE /course-enrollments/:id
// Removes one course from an enrollment and gives the seat back to the semester.
export async function dropCourse(req, res, next) {
    const session = await mongoose.startSession()
    try{
        const id = req.params.id
        if (!isId(id)) return res.status(400).json({error: "Invalid course enrollment id"})
 
        let dropped = null
        await session.withTransaction(async () => {
            dropped = await CourseEnrollment.findOneAndDelete({ _id: id }, { session })
            if (dropped) {
                await Semester.updateOne(
                    { _id: dropped.semester, "offerings.course": dropped.course },
                    { $inc: { "offerings.$.enrolled": -1 } },
                    { session }
                )
            }
        })
 
        if (!dropped) return res.status(404).json({error: "Course enrollment not found"})
        res.status(200).json({message: "Course dropped, seat released", _id: id})
    }
    catch(err){
        next(err)
    }
    finally{
        await session.endSession()
    }
}
