import mongoose from "mongoose";
import Enrollment from "../models/enrollment_model.js";
import Student from "../models/student_model.js";
import Employee from "../models/employee_model.js";
import Program from "../models/program_model.js";
import Semester from "../models/semester_model.js";
import Block from "../models/block_model.js";
import Course from "../models/course_model.js";
import CourseEnrollment from "../models/course_enrollment_model.js";
import CourseRecord from "../models/course_record_model.js";
import { claimSeat } from "../helpers/seat_helper.js";
 
const isId = (value) => mongoose.isValidObjectId(String(value))


//POST
// Creates the enrollment and enrolls the student in every course of the block that
// they qualify for, in one transaction (needs a replica set; MongoDB Atlas has one).
//
// A course in the block is skipped, and reported back, when:
//   not_open              the course isn't offered (or is switched off) this semester
//   already_passed        the student has already passed it
//   missing_prerequisites a prerequisite hasn't been passed
//   no_seat               the course is full
// The student can add a missing prerequisite afterwards with POST /course-enrollments.
export async function createEnrollment(req, res) {
    const session = await mongoose.startSession()
    try{
        const student = Number(req.body.student)
        if (!Number.isInteger(student) || student <= 0) {
            return res.status(400).json({error: "student must be a student id number"})
        }
        for (const field of ["approved_by", "program", "semester", "block"]) {
            if (!isId(req.body[field])) {
                return res.status(400).json({error: `Invalid ${field} id`})
            }
        }
 
        const [studentExists, employeeExists, programExists, semester, block] = await Promise.all([
            Student.exists({ _id: student }),
            Employee.exists({ _id: req.body.approved_by }),
            Program.exists({ _id: req.body.program }),
            Semester.findById(req.body.semester),
            Block.findById(req.body.block)
        ])
        if (!studentExists)  return res.status(400).json({error: "Student does not exist"})
        if (!employeeExists) return res.status(400).json({error: "Approving employee does not exist"})
        if (!programExists)  return res.status(400).json({error: "Program does not exist"})
        if (!semester)       return res.status(400).json({error: "Semester does not exist"})
        if (!block)          return res.status(400).json({error: "Block does not exist"})
        if (String(block.semester) !== String(semester._id)) {
            return res.status(400).json({error: "That block is not in this semester"})
        }
 
        // Work out which of the block's courses the student can take
        const courses = await Course.find({ _id: { $in: block.courses.map(c => c.course) } })
            .populate({ path: "prerequisites", select: "code name" })
        const passed = new Set(
            (await CourseRecord.distinct("course", { student, status: "passed" })).map(String)
        )
        const offerings = new Map(semester.offerings.map(o => [String(o.course), o]))
 
        const eligible = []
        const skipped = []
        for (const course of courses) {
            const offering = offerings.get(String(course._id))
            const info = { course: course._id, code: course.code, name: course.name }
 
            if (!offering || !offering.course_active) {
                skipped.push({ ...info, reason: "not_open" })
                continue
            }
            if (passed.has(String(course._id))) {
                skipped.push({ ...info, reason: "already_passed" })
                continue
            }
            const missing = course.prerequisites.filter(p => !passed.has(String(p._id)))
            if (missing.length > 0) {
                skipped.push({
                    ...info,
                    reason: "missing_prerequisites",
                    missing_prerequisites: missing.map(p => ({ _id: p._id, code: p.code, name: p.name }))
                })
                continue
            }
            eligible.push({ course, capacity: offering.capacity })
        }
 
        // Create the enrollment and claim a seat for each eligible course, all or nothing
        let result = null
        await session.withTransaction(async () => {
            const [created] = await Enrollment.create([{
                student,
                approved_by:   req.body.approved_by,
                program:       req.body.program,
                semester:      req.body.semester,
                block:         req.body.block,
                standing_year: req.body.standing_year
            }], { session })
 
            const enrolled = []
            const noSeat = []
            for (const { course, capacity } of eligible) {
                const info = { course: course._id, code: course.code, name: course.name }
                const record = await claimSeat({
                    enrollment: created,
                    courseId:   course._id,
                    blockId:    block._id,
                    source:     "block",
                    capacity,
                    session
                })
                if (record) enrolled.push(info)
                else noSeat.push({ ...info, reason: "no_seat" })
            }
 
            result = { created, enrolled, noSeat }
        })
 
        res.status(201).json({
            enrollment: result.created,
            enrolled:   result.enrolled,
            skipped:    [...skipped, ...result.noSeat]
        })
    }
    catch(err){
        if (err.code === 11000) {
            return res.status(409).json({error: "This student is already enrolled for this semester"})
        }
        res.status(400).json({error:err.message})
    }
    finally{
        await session.endSession()
    }
}

//GET
export async function getEnrollments(req, res) {
    try{
        const filter = {}
 
        if (req.query.student !== undefined) {
            const student = Number(req.query.student)
            if (!Number.isInteger(student)) {
                return res.status(400).json({error: "student must be a number"})
            }
            filter.student = student
        }
 
        for (const field of ["semester", "program", "block", "approved_by"]) {
            if (req.query[field] !== undefined) {
                if (!isId(req.query[field])) {
                    return res.status(400).json({error: `Invalid ${field} id`})
                }
                filter[field] = req.query[field]
            }
        }
 
        const page  = Math.max(parseInt(req.query.page)  || 1, 1)
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100)
 
        const [enrollments, total] = await Promise.all([
            Enrollment.find(filter)
                .sort({ _id: -1 })                
                .skip((page - 1) * limit)
                .limit(limit),
            Enrollment.countDocuments(filter)
        ])
 
        res.status(200).json({ page, limit, total, enrollments })
    }
    catch(err){
        res.status(500).json({error:err.message})
    }
}

//GET id
export async function getEnrollment(req, res) {
    try{
        const id = req.params.id
        if (!isId(id)) return res.status(400).json({error: "Invalid enrollment id"})
 
        const enrollment = await Enrollment.findById(id)
            .populate({ path: "student",     select: "first_name middle_name last_name" })
            .populate({ path: "approved_by", select: "first_name middle_name last_name" })
            .populate({ path: "program",     select: "name major" })
            .populate({ path: "semester",    select: "semester_term academic_year" })
            .populate({ path: "block",       select: "section_name" })
        if (!enrollment) return res.status(404).json({error: "Enrollment not found"})
 
        // The courses this enrollment actually holds seats in
        const courses = await CourseEnrollment.find({ enrollment: id })
            .select("course source")
            .populate({ path: "course", select: "code name units" })
 
        res.status(200).json({ ...enrollment.toObject(), courses })
    }
    catch(err){
        res.status(500).json({error:err.message})
    }
}

//PUT
export async function updateEnrollment(req, res) {
    try{
        const id = req.params.id
        if (!isId(id)) return res.status(400).json({error: "Invalid enrollment id"})
 
        const enrollment = await Enrollment.findById(id)
        if (!enrollment) return res.status(404).json({error: "Enrollment not found"})
 
        const changes = {}
 
        if (req.body.standing_year !== undefined) changes.standing_year = req.body.standing_year
 
        if (req.body.approved_by !== undefined) {
            if (!isId(req.body.approved_by)) {
                return res.status(400).json({error: "Invalid employee id"})
            }
            if (!await Employee.exists({ _id: req.body.approved_by })) {
                return res.status(400).json({error: "Approving employee does not exist"})
            }
            changes.approved_by = req.body.approved_by
        }
 
        if (req.body.program !== undefined) {
            if (!isId(req.body.program)) {
                return res.status(400).json({error: "Invalid program id"})
            }
            if (!await Program.exists({ _id: req.body.program })) {
                return res.status(400).json({error: "Program does not exist"})
            }
            changes.program = req.body.program
        }
 
        if (Object.keys(changes).length === 0) {
            return res.status(400).json({error: "No valid fields to update"})
        }
 
        enrollment.set(changes)
        const saved = await enrollment.save()
        res.status(200).json(saved)
    }
    catch(err){
        res.status(400).json({error:err.message})
    }
}

//DELETE
export async function deleteEnrollment(req, res) {
    const session = await mongoose.startSession()
    try{
        const id = req.params.id
        if (!isId(id)) return res.status(400).json({error: "Invalid enrollment id"})
 
        const enrollment = await Enrollment.findById(id)
        if (!enrollment) return res.status(404).json({error: "Enrollment not found"})
 
        let released = 0
        await session.withTransaction(async () => {
            const records = await CourseEnrollment.find({ enrollment: id }).session(session)
 
            for (const record of records) {
                await Semester.updateOne(
                    { _id: record.semester, "offerings.course": record.course },
                    { $inc: { "offerings.$.enrolled": -1 } },
                    { session }
                )
            }
 
            await CourseEnrollment.deleteMany({ enrollment: id }, { session })
            await Enrollment.deleteOne({ _id: id }, { session })
            released = records.length
        })
 
        res.status(200).json({ message: "Enrollment deleted", _id: id, seats_released: released })
    }
    catch(err){
        res.status(500).json({error:err.message})
    }
    finally{
        await session.endSession()
    }
}
