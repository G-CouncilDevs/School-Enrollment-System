import mongoose from "mongoose";
import Course from "../models/course_model.js";
import Program from "../models/program_model.js";
import Semester from "../models/semester_model.js";
import Block from "../models/block_model.js";
import CourseEnrollment from "../models/course_enrollment_model.js";
import CourseRecord from "../models/course_record_model.js";

//POST
export async function createCourse(req, res) {
    try{
        const newCourse = new Course({
            name:           req.body.name,
            code:           req.body.code,
            units:          req.body.units,
            prerequisites:  req.body.prerequisites
        })
        const saved = await newCourse.save()
        res.status(201).json(saved)
    }
    catch (err){
        if (err.code === 11000) {
            return res.status(409).json({error: "That course code already exists"})
    }
        res.status(400).json({error:err.message})
    }
}

//GET
export async function getCourses(req, res) {
    try{
        const filter = {}
        if (req.query.search) {
            const safe = String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            const expression = new RegExp(safe, "i")
            filter.$or = [
                {name: expression},
                {code: expression},
            ]
        }
        if (req.query.code){
            const safe = String(req.query.code).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            filter.code = new RegExp("^" + safe + "$", "i")
        }
        if (req.query.name){
            const safe = String(req.query.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            filter.name = new RegExp("^" + safe, "i")
        }

        const page = Math.max(parseInt(req.query.page) || 1, 1)
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100)

        const [courses, total] = await Promise.all([
            Course.find(filter)
                .populate({ path: "prerequisites", select: "code name" })
                .sort({code: 1})
                .skip((page - 1) * limit)
                .limit(limit),
            Course.countDocuments(filter)
        ])
        res.status(200).json({page, limit, total, courses})
    }
    catch(err){
        res.status(500).json({error:err.message})
    }
}

//GET id
export async function getCourse(req, res) {
    try{
        const id = String(req.params.id ?? "")
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({error: "Invalid course id"})
        }

        const course = await Course.findById(id)
            .populate({ path: "prerequisites", select: "code name" })
        if(!course) return res.status(404).json({error: "Course not found"})

        res.status(200).json(course)
    }
    catch(err){
        res.status(500).json({error:err.message})
    }
}

//PUT
export async function updateCourse(req, res) {
    try{
        const id = String(req.params.id ?? "")
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({error: "Invalid course id"})
        }

        const course = await Course.findById(id)
        if (!course) return res.status(404).json({error: "Course not found"})

        const changes = {}
        for (const field of ["name", "units"]){
            if (req.body[field] !== undefined) changes[field] = req.body[field]
        }

        if (req.body.prerequisites !== undefined){
            if (!Array.isArray(req.body.prerequisites)) {
                return res.status(400).json({error: "Pre-requisites must be an array of course ID"})
            }
            const ids = [...new Set(req.body.prerequisites.map(String))]
            const found = await Course.countDocuments({_id: {$in: ids} })

            if (found !== ids.length){
                    return res.status(400).json({error: "One or more prerequisites do not exist"})
            }
            changes.prerequisites = ids
        }

        if (Object.keys(changes).length == 0){
            return res.status(400).json({error: "No Valid fields to update"})
        }

        course.set(changes)
        const saved = await course.save()
        res.status(200).json(saved)
    }
    catch(err){
        res.status(400).json({error:err.message})
    }
}

//DELETE
export async function deleteCourse(req, res) {
    try{
        const id = String(req.params.id ?? "")
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({error: "Invalid course id"})
        }

        const course = await Course.findById(id)
        if (!course) return res.status(404).json({error: "Course not found"})

        const used = await Promise.all([
            Course.exists({ prerequisites: id }),
            Program.exists({ "courses.course": id }),
            Semester.exists({ "offerings.course": id }),
            Block.exists({ "courses.course": id }),
            CourseEnrollment.exists({ course: id }),
            CourseRecord.exists({ course: id })
        ])
        const reasons = [
            "it is a prerequisite of another course",
            "it is part of a program",
            "it is offered in a semester",
            "it is used in a block",
            "students are enrolled in it",
            "students have records for it"
        ]
        const hit = used.findIndex(Boolean)
        if (hit !== -1) {
            return res.status(409).json({error: `Cannot delete: ${reasons[hit]}`})
        }

        await Course.findByIdAndDelete(id)
        res.status(200).json({message: "Course deleted", id})
    }
    catch(err){
        res.status(500).json({error:err.message})
    }
}
//make a Delete and edit and make a get function for everything