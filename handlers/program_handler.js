import mongoose from "mongoose";
import Program from "../models/program_model.js";
import Enrollment from "../models/enrollment_model.js";
import Course from "../models/course_model.js"

export async function createProgram(req, res) {
    try{
        const newProgram = new Program({
            name:   req.body.name,
            major:  req.body.major,
            courses: req.body.courses
        })
        const saved = await newProgram.save()
        res.status(201).json(saved)
    }
    catch(err){
        res.status(400).json({error:err.message})
    }
}

//GET
export async function getPrograms(req, res) {
    try{
        const filter = {}
        if (req.query.name){
            const safe = String(req.query.last_name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            filter.last_name = new RegExp("^" + safe, "i")
        }

        const page = Math.max(parseInt(req.query.page) || 1, 1)
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100)

        const [programs, total] = await Promise.all([
            Program.find(filter)
                .sort({name: 1})
                .skip((page - 1) * limit)
                .limit(limit),
            Program.countDocuments(filter)
        ])
        res.status(200).json({page, limit, total, programs})
    }
    catch(err){
        res.status(500).json({error:err.message})
    }
}

//PUT
export async function updateProgram(req, res) {
    try{
        const id = req.params.id
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({error: "Invalid program id"})
        }

        const program = await Program.findById(id)
        if (!program) return res.status(404).json({error: "Program not found"})

        // Allow-list: only these fields can change
        const changes = {}
        for (const field of ["name", "major"]) {
            if (req.body[field] !== undefined) changes[field] = req.body[field]
        }

        if (req.body.courses !== undefined) {
            if (!Array.isArray(req.body.courses)) {
                return res.status(400).json({error: "courses must be an array"})
            }

            const ids = req.body.courses.map(entry => String(entry?.course))
            if (ids.some(courseId => !mongoose.isValidObjectId(courseId))) {
                return res.status(400).json({error: "Each course entry needs a valid course id"})
            }
            if (new Set(ids).size !== ids.length) {
                return res.status(400).json({error: "A course can only appear once in a program"})
            }
            const found = await Course.countDocuments({ _id: { $in: ids } })
            if (found !== ids.length) {
                return res.status(400).json({error: "One or more courses do not exist"})
            }

            changes.courses = req.body.courses.map(entry => ({
                course:     entry.course,
                year_level: entry.year_level
            }))
        }

        if (Object.keys(changes).length === 0) {
            return res.status(400).json({error: "No valid fields to update"})
        }

        program.set(changes)
        const saved = await program.save()
        res.status(200).json(saved)
    }
    catch(err){
        res.status(400).json({error:err.message})
    }
}

//DELETE
export async function deleteProgram(req, res) {
    try{
        const id = req.params.id
        if (!mongoose.isValidObjectId(id)){
            return res.status(400).json({error: "Invalid Program id"})
        }

        const program = await Program.findById(id)
        if (!program) return res.status(404).json({error: "Program not found"})

        if (await Enrollment.exists({ program: id })) {
            return res.status(409).json({error: "Cannot delete: students enrolled in this program"})
        }
        
        await Program.findByIdAndDelete(id)
        res.status(200).json({message: "Program deleted", _id: id})
    }
    catch(err){
        res.status(500).json({error:err.message})
    }
}