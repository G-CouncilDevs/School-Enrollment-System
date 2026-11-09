import mongoose from "mongoose";
import CourseRecord from "../models/course_record_model.js";
import Student from "../models/student_model.js";
import Course from "../models/course_model.js";
import Semester from "../models/semester_model.js";
import { isId } from "../utils/validate.js";
import { parsePage } from "../utils/pagination.js";
 
const STATUSES = ["passed", "failed", "in_progress"]

export async function createCourseRecord(req, res, next) {
    try{
        const student = Number(req.body.student)
        if (!Number.isInteger(student) || student <= 0) {
            return res.status(400).json({error: "student must be a student id number"})
        }
        if (!await Student.exists({ _id: student })) {
            return res.status(400).json({error: "Student does not exist"})
        }
 
        if (!isId(req.body.course)) {
            return res.status(400).json({error: "Invalid course id"})
        }
        if (!await Course.exists({ _id: req.body.course })) {
            return res.status(400).json({error: "Course does not exist"})
        }
 
        // The semester is optional (for example, transfer credits have none)
        if (req.body.semester) {
            if (!isId(req.body.semester)) {
                return res.status(400).json({error: "Invalid semester id"})
            }
            if (!await Semester.exists({ _id: req.body.semester })) {
                return res.status(400).json({error: "Semester does not exist"})
            }
        }
 
        const newRecord = new CourseRecord({
            student:   student,
            course:    req.body.course,
            semester:  req.body.semester || undefined,
            status:    req.body.status,
            grade:     req.body.grade
        })
        const saved = await newRecord.save()
        res.status(201).json(saved)
    }
    catch(err){
        if (err.code === 11000) {
            return res.status(409).json({error: "This student already has a record for that course in that semester"})
        }
        next(err)
    }
}
 
// ---------- GET ALL ----------
// GET /course-records
// Optional query string (all exact matches):
//   ?student=2026000001  ?course=<id>  ?semester=<id>  ?status=passed
//   ?page=1&limit=10
export async function getCourseRecords(req, res, next) {
    try{
        const filter = {}
 
        if (req.query.student !== undefined) {
            const student = Number(req.query.student)
            if (!Number.isInteger(student)) {
                return res.status(400).json({error: "student must be a number"})
            }
            filter.student = student
        }
 
        for (const field of ["course", "semester"]) {
            if (req.query[field] !== undefined) {
                if (!isId(req.query[field])) {
                    return res.status(400).json({error: `Invalid ${field} id`})
                }
                filter[field] = req.query[field]
            }
        }
 
        if (req.query.status !== undefined) {
            if (!STATUSES.includes(req.query.status)) {
                return res.status(400).json({error: `status must be one of: ${STATUSES.join(", ")}`})
            }
            filter.status = req.query.status
        }
 
        const { page, limit } = parsePage(req.query)
 
        const [records, total] = await Promise.all([
            CourseRecord.find(filter)
                .sort({ _id: -1 })                 // newest first
                .skip((page - 1) * limit)
                .limit(limit),
            CourseRecord.countDocuments(filter)
        ])
 
        res.status(200).json({ page, limit, total, records })
    }
    catch(err){
        next(err)
    }
}
 
// ---------- GET ONE ----------
// GET /course-records/:id
export async function getCourseRecord(req, res, next) {
    try{
        const id = req.params.id
        if (!isId(id)) return res.status(400).json({error: "Invalid course record id"})
 
        const record = await CourseRecord.findById(id)
            .populate({ path: "student",  select: "first_name middle_name last_name" })
            .populate({ path: "course",   select: "code name units" })
            .populate({ path: "semester", select: "semester_term academic_year" })
        if (!record) return res.status(404).json({error: "Course record not found"})
 
        res.status(200).json(record)
    }
    catch(err){
        next(err)
    }
}
 
// ---------- UPDATE ----------
// PUT /course-records/:id
// Only status and grade can change. A wrong student, course or semester
// means a different record: delete this one and create a new one.
export async function updateCourseRecord(req, res, next) {
    try{
        const id = req.params.id
        if (!isId(id)) return res.status(400).json({error: "Invalid course record id"})
 
        const record = await CourseRecord.findById(id)
        if (!record) return res.status(404).json({error: "Course record not found"})
 
        const changes = {}
        for (const field of ["status", "grade"]) {
            if (req.body[field] !== undefined) changes[field] = req.body[field]
        }
        if (Object.keys(changes).length === 0) {
            return res.status(400).json({error: "No valid fields to update"})
        }
 
        record.set(changes)
        const saved = await record.save()
        res.status(200).json(saved)
    }
    catch(err){
        next(err)
    }
}
 
// ---------- DELETE ----------
// DELETE /course-records/:id
// Nothing references a course record, so there is no blocking check.
// Note: deleting a "passed" record does not re-check enrollments that relied on it.
export async function deleteCourseRecord(req, res, next) {
    try{
        const id = req.params.id
        if (!isId(id)) return res.status(400).json({error: "Invalid course record id"})
 
        const deleted = await CourseRecord.findByIdAndDelete(id)
        if (!deleted) return res.status(404).json({error: "Course record not found"})
 
        res.status(200).json({message: "Course record deleted", _id: id})
    }
    catch(err){
        next(err)
    }
}
