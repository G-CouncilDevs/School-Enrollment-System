import mongoose from "mongoose";
import Block from "../models/block_model.js";
import Semester from "../models/semester_model.js";
import Course from "../models/course_model.js";
import Employee from "../models/employee_model.js";
import Student from "../models/student_model.js";
import Enrollment from "../models/enrollment_model.js";
import CourseEnrollment from "../models/course_enrollment_model.js";

const isId = (value) => mongoose.isValidObjectId(String(value))

//POST
export async function createBlock(req, res) {
    try{
        const newBlock = new Block({
            semester:   req.body.semester,
            section_name:   req.body.section_name,
            courses:    req.body.courses,
            students:   req.body.students
        })
        const saved = await newBlock.save()
        res.status(201).json(saved)
    }
    catch(err){
        if (err.code === 11000) {
            return res.status(409).json({error: "That section already exists for this semester"})
    }
        res.status(400).json({error:err.message})
    }
}

//GET
export async function getBlocks(req, res) {
    try{
        const filter = {}

        if (req.query.semester !== undefined) {
            if (!isId(req.query.semester)) {
                return res.status(400).json({error: "Invalid semester id"})
            }
            filter.semester = req.query.semester
        }
        if (req.query.section_name){
            const safe = String(req.query.section_name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            filter.section_name = new RegExp("^" + safe, "i")
        }

        const page = Math.max(parseInt(req.query.page) || 1, 1)
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100)

        const [blocks, total] = await Promise.all([
            Block.find(filter)
                .sort({section_name: 1})
                .skip((page - 1) * limit)
                .limit(limit),
            Block.countDocuments(filter)
        ])
        const populated = await Block.populate(blocks, [
            { path: "semester", select: "semester_term academic_year" },
            {
                path: "courses.course",
                select: "code name units prerequisites",
                populate: { path: "prerequisites", select: "code name" },
            },
            { path: "courses.employee", select: "first_name middle_name last_name" },
        ])
        res.status(200).json({page, limit, total, blocks: populated})
    }
    catch(err){
        res.status(500).json({error:err.message})
    }
}

//GET id
export async function getBlock(req, res) {
    try{
        const id = req.params.id
        if (!isId(id)) return res.status(400).json({error: "Invalid block id"})
 
        const block = await Block.findById(id)
            .populate({ path: "semester",         select: "semester_term academic_year" })
            .populate({
                path: "courses.course",
                select: "code name units prerequisites",
                populate: { path: "prerequisites", select: "code name" },
            })
            .populate({ path: "courses.employee", select: "first_name middle_name last_name" })
            .populate({ path: "students",         select: "first_name middle_name last_name" })
        if (!block) return res.status(404).json({error: "Block not found"})
 
        res.status(200).json(block)
    }
    catch(err){
        res.status(500).json({error:err.message})
    }
}

//PUT
export async function updateBlock(req, res) {
    try{
        const id = req.params.id
        if (!isId(id)) return res.status(400).json({error: "Invalid block id"})
 
        const block = await Block.findById(id)
        if (!block) return res.status(404).json({error: "Block not found"})
 
        const changes = {}
 
        if (req.body.section_name !== undefined) changes.section_name = req.body.section_name
 
        // --- semester ---
        if (req.body.semester !== undefined) {
            if (!isId(req.body.semester)) {
                return res.status(400).json({error: "Invalid semester id"})
            }
            if (String(req.body.semester) !== String(block.semester)) {
                // Seats were claimed in the old semester, so a block with enrollments can't move
                if (await Enrollment.exists({ block: id }) || await CourseEnrollment.exists({ block: id })) {
                    return res.status(409).json({error: "Cannot move a block that already has enrollments"})
                }
            }
            changes.semester = req.body.semester
        }
 
        // --- courses ---
        if (req.body.courses !== undefined) {
            if (!Array.isArray(req.body.courses)) {
                return res.status(400).json({error: "courses must be an array"})
            }
 
            const courseIds = req.body.courses.map(entry => String(entry?.course))
            if (courseIds.some(courseId => !isId(courseId))) {
                return res.status(400).json({error: "Each course entry needs a valid course id"})
            }
            if (new Set(courseIds).size !== courseIds.length) {
                return res.status(400).json({error: "A course can only appear once in a block"})
            }
 
            const employeeIds = [...new Set(
                req.body.courses.filter(entry => entry.employee).map(entry => String(entry.employee))
            )]
            if (employeeIds.some(employeeId => !isId(employeeId))) {
                return res.status(400).json({error: "Each instructor needs a valid employee id"})
            }
 
            if (await Course.countDocuments({ _id: { $in: courseIds } }) !== courseIds.length) {
                return res.status(400).json({error: "One or more courses do not exist"})
            }
            if (await Employee.countDocuments({ _id: { $in: employeeIds } }) !== employeeIds.length) {
                return res.status(400).json({error: "One or more instructors do not exist"})
            }
 
            // A course that students already took through this block can't be removed from it
            const removed = block.courses.map(c => String(c.course)).filter(c => !courseIds.includes(c))
            if (removed.length && await CourseEnrollment.exists({ block: id, course: { $in: removed } })) {
                return res.status(409).json({error: "Cannot remove a course that students are enrolled in"})
            }
 
            changes.courses = req.body.courses.map(entry => ({
                course:   entry.course,
                employee: entry.employee || undefined,
                schedule: entry.schedule,
                room:     entry.room
            }))
        }
 
        // --- every course in the block must be offered in the block's semester ---
        if (changes.courses || changes.semester) {
            const semester = await Semester.findById(changes.semester ?? block.semester)
            if (!semester) return res.status(400).json({error: "Semester does not exist"})
 
            const offered = new Set(semester.offerings.map(o => String(o.course)))
            const finalCourses = (changes.courses ?? block.courses).map(c => String(c.course))
            if (finalCourses.some(courseId => !offered.has(courseId))) {
                return res.status(400).json({error: "Every course in a block must be offered in its semester"})
            }
        }
 
        // --- students ---
        if (req.body.students !== undefined) {
            if (!Array.isArray(req.body.students)) {
                return res.status(400).json({error: "students must be an array of student ids"})
            }
 
            const studentIds = req.body.students.map(Number)
            if (studentIds.some(n => !Number.isInteger(n) || n <= 0)) {
                return res.status(400).json({error: "Each student id must be a number"})
            }
            if (new Set(studentIds).size !== studentIds.length) {
                return res.status(400).json({error: "A student can only appear once in a block"})
            }
            if (await Student.countDocuments({ _id: { $in: studentIds } }) !== studentIds.length) {
                return res.status(400).json({error: "One or more students do not exist"})
            }
 
            // A student who already took courses through this block can't be removed from it
            const removed = block.students.filter(s => !studentIds.includes(s))
            if (removed.length && await CourseEnrollment.exists({ block: id, student: { $in: removed } })) {
                return res.status(409).json({error: "Cannot remove a student who is enrolled through this block"})
            }
 
            changes.students = studentIds
        }
 
        if (Object.keys(changes).length === 0) {
            return res.status(400).json({error: "No valid fields to update"})
        }
 
        block.set(changes)
        const saved = await block.save()
        res.status(200).json(saved)
    }
    catch(err){
        if (err.code === 11000) {
            return res.status(409).json({error: "That section already exists for this semester"})
        }
        res.status(400).json({error:err.message})
    }
}


//DELETE
export async function deleteBlock(req, res) {
    try{
        const id = req.params.id
        if (!isId(id)) return res.status(400).json({error: "Invalid block id"})
 
        const block = await Block.findById(id)
        if (!block) return res.status(404).json({error: "Block not found"})
 
        const used = await Promise.all([
            Enrollment.exists({ block: id }),
            CourseEnrollment.exists({ block: id })
        ])
        const reasons = [
            "students are enrolled in this block",
            "students have course enrollments in this block"
        ]
        const hit = used.findIndex(Boolean)
        if (hit !== -1) {
            return res.status(409).json({error: `Cannot delete: ${reasons[hit]}`})
        }
 
        await Block.findByIdAndDelete(id)
        res.status(200).json({message: "Block deleted", _id: id})
    }
    catch(err){
        res.status(500).json({error:err.message})
    }
}
