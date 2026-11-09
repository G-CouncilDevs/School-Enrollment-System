import Semester from "../models/semester_model.js";
import Course from "../models/course_model.js";
import Block from "../models/block_model.js";
import Enrollment from "../models/enrollment_model.js";
import CourseEnrollment from "../models/course_enrollment_model.js";
import CourseRecord from "../models/course_record_model.js";
import { isId } from "../utils/validate.js";
import { parsePage } from "../utils/pagination.js";

//POST
export async function createSemester(req, res, next) {
    try{
        const newSemester = new Semester({
            semester_term:   req.body.semester_term,
            academic_year:  req.body.academic_year,
            offerings:  req.body.offerings
        })
        const saved = await newSemester.save()
        res.status(201).json(saved)
    }
    catch(err){
        if (err.code === 11000) {
            return res.status(409).json({error: "That term already exists for this academic year"})
        }
        next(err)
    }
}

//GET
export async function getSemesters(req, res, next) {
    try{
        const filter = {}
        if (req.query.academic_year !== undefined) {
            const year = Number(req.query.academic_year)
            if (!Number.isInteger(year)) {
                return res.status(400).json({error: "academic_year must be a number"})
            }
            filter.academic_year = year
            }
        if (req.query.semester_term !== undefined) {
            if (!["1st", "2nd", "3rd"].includes(req.query.semester_term)) {
                return res.status(400).json({error: "semester_term must be 1st, 2nd or 3rd"})
            }
            filter.semester_term = req.query.semester_term
        }

        const { page, limit } = parsePage(req.query)

        const [semesters, total] = await Promise.all([
            Semester.find(filter)
                .sort({academic_year: -1, semester_term: 1})
                .skip((page - 1) * limit)
                .limit(limit),
            Semester.countDocuments(filter)
        ])
        res.status(200).json({page, limit, total, semesters})
    }
    catch(err){
        next(err)
    }
}

//GET id
 export async function getSemester(req, res, next) {
    try{
        const id = req.params.id
        if(!isId(id)){
            return res.status(400).json({error: "Invalid semester ID"})
        }

        const semester = await Semester.findById(id)
            .populate({ path: "offerings.course", select: "code name units" })

        if (!semester) return res.status(404).json({error: "Semester not found"})

        // Add the seats left to each offering (calculated, never stored)

        const data = semester.toObject()
        data.offerings = data.offerings.map(o => ({ ...o, available: o.capacity - o.enrolled }))
        res.status(200).json(data)
    }
    catch(err){
        next(err)
    }
} 

//PUT
export async function updateSemester(req, res, next) {
    try{
        const id = req.params.id
        if (!isId(id)) {
            return res.status(400).json({error: "Invalid semester id"})
        }

        const semester = await Semester.findById(id)
        if (!semester) return res.status(404).json({error: "Semester not found"})

        const changes = {}
        for (const field of ["semester_term", "academic_year"]) {
            if (req.body[field] !== undefined) changes[field] = req.body[field]
        }

        if (req.body.offerings !== undefined) {
            if (!Array.isArray(req.body.offerings)) {
                return res.status(400).json({error: "offerings must be an array"})
            }

            const ids = req.body.offerings.map(entry => String(entry?.course))
            if (ids.some(courseId => !isId(courseId))) {
                return res.status(400).json({error: "Each offering needs a valid course id"})
            }
            if (new Set(ids).size !== ids.length) {
                return res.status(400).json({error: "A course can only be offered once per semester"})
            }
            const found = await Course.countDocuments({ _id: { $in: ids } })
            if (found !== ids.length) {
                return res.status(400).json({error: "One or more courses do not exist"})
            }

            const current = new Map(semester.offerings.map(o => [String(o.course), o]))

            // An offering that still has students can't be dropped
            for (const [courseId, offering] of current) {
                if (!ids.includes(courseId) && offering.enrolled > 0) {
                    return res.status(409).json({error: "Cannot remove an offering that has enrolled students"})
                }
            }

            // "enrolled" is never taken from the client; it is carried over from the saved offering
            const offerings = []
            for (const entry of req.body.offerings) {
                const existing = current.get(String(entry.course))
                const capacity = entry.capacity ?? existing?.capacity
                const enrolled = existing?.enrolled ?? 0

                if (capacity < enrolled) {
                    return res.status(409).json({error: "Capacity cannot be lower than the number already enrolled"})
                }
                offerings.push({
                    course:        entry.course,
                    course_active: entry.course_active ?? existing?.course_active,
                    capacity,
                    enrolled
                })
            }
            changes.offerings = offerings
        }

        if (Object.keys(changes).length === 0) {
            return res.status(400).json({error: "No valid fields to update"})
        }

        semester.set(changes)
        const saved = await semester.save()
        res.status(200).json(saved)
    }
    catch(err){
        if (err.code === 11000) {
            return res.status(409).json({error: "That term already exists for this academic year"})
        }
        next(err)
    }
}

//DELETE
export async function deleteSemester(req, res, next) {
    try{
        const id = req.params.id
        if (!isId(id)) {
            return res.status(400).json({error: "Invalid semester id"})
        }

        const semester = await Semester.findById(id)
        if (!semester) return res.status(404).json({error: "Semester not found"})

        const used = await Promise.all([
            Block.exists({ semester: id }),
            Enrollment.exists({ semester: id }),
            CourseEnrollment.exists({ semester: id }),
            CourseRecord.exists({ semester: id })
        ])
        const reasons = [
            "it has blocks",
            "it has enrollments",
            "students are enrolled in its courses",
            "students have records for it"
        ]
        const hit = used.findIndex(Boolean)
        if (hit !== -1) {
            return res.status(409).json({error: `Cannot delete: ${reasons[hit]}`})
        }

        await Semester.findByIdAndDelete(id)
        res.status(200).json({message: "Semester deleted", _id: id})
    }
    catch(err){
        next(err)
    }
}