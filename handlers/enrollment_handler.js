import mongoose from "mongoose";
import Enrollment from "../models/enrollment_model.js";
import Employee from "../models/employee_model.js";
import Program from "../models/program_model.js";
import Semester from "../models/semester_model.js";
import CourseEnrollment from "../models/course_enrollment_model.js";

// Imported so populate() can find the models, even though the code doesn't name them, it's fucking stupid
import "../models/student_model.js";
import "../models/block_model.js";
import "../models/course_model.js";

const isId = (value) => mongoose.isValidObjectId(String(value))

export async function createEnrollment(req, res) {
    try{
        const newEnrollment = new Enrollment({
            student:        req.body.student,
            approved_by:    req.body.approved_by,
            program:        req.body.program,
            semester:       req.body.semester,
            block:          req.body.block,
            standing_year:  req.body.standing_year
        })
        const saved = await newEnrollment.save()
        res.status(201).json(saved)
    }
    catch(err){
        if (err.code === 11000) {
            return res.status(409).json({error: "This student is already enrolled for this semester"})
    }
        res.status(400).json({error:err.message})
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
            .populate({ path: "semester",    select: "term academic_year" })
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



