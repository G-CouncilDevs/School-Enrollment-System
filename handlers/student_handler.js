import Student from "../models/student_model.js";
import Enrollment from "../models/enrollment_model.js"
import Block from "../models/block_model.js";
import CourseEnrollment from "../models/course_enrollment_model.js";
import CourseRecord from "../models/course_record_model.js";
import { nextStudentID } from "../models/studentID_generator.js";
import { isId } from "../utils/validate.js";
import { parsePage } from "../utils/pagination.js";

// Since MonggoDB passes the special ID to a String, this parses it into a Number
function parseID(raw){
    const id = Number(raw)
    return Number.isInteger(id) ? id : null
}

//POST
export async function createStudent(req, res, next) {
    try{
        const newStudent = new Student({
            _id:        await nextStudentID(),
            first_name: req.body.first_name,
            middle_name:req.body.middle_name,
            last_name:  req.body.last_name,
            sex:        req.body.sex,
            birth_date: req.body.birth_date,
            address:    req.body.address
        })
        const saved = await newStudent.save()
        res.status(201).json(saved)
    }
    catch (err){
        next(err)
    }
}

//GET
export async function getStudents(req, res, next) {
    try{
        const andClauses = []

        if (req.query.student_id) {
            const id = Number(req.query.student_id)
            if (Number.isInteger(id)) {
                andClauses.push({ _id: id })
            }
        }

        const enrollmentFilter = {}
        if (req.query.program) {
            if (!isId(req.query.program)) {
                return res.status(400).json({error: "Invalid program id"})
            }
            enrollmentFilter.program = req.query.program
        }

        if (req.query.semester && !req.query.course) {
            if (!isId(req.query.semester)) {
                return res.status(400).json({error: "Invalid semester id"})
            }
            enrollmentFilter.semester = req.query.semester
        }

        if (Object.keys(enrollmentFilter).length > 0) {
            const enrolledStudentIds = await Enrollment.distinct("student", enrollmentFilter)
            andClauses.push({ _id: { $in: enrolledStudentIds } })
        }

        if (req.query.course) {
            if (!isId(req.query.course)) {
                return res.status(400).json({error: "Invalid course id"})
            }
            const query = { course: req.query.course }
            if (req.query.semester) {
                if (!isId(req.query.semester)) {
                    return res.status(400).json({error: "Invalid semester id"})
                }
                query.semester = req.query.semester
            }
            const enrolledStudentIds = await CourseEnrollment.distinct("student", query)
            andClauses.push({ _id: { $in: enrolledStudentIds } })
        }

        if (req.query.search) {
            const search = String(req.query.search).trim()
            const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            const expression = new RegExp(safe, "i")
            const searchOr = [
                { first_name: expression },
                { last_name: expression },
                { middle_name: expression },
                {
                    $expr: {
                        $regexMatch: {
                            input: {
                                $concat: [
                                    { $ifNull: ["$first_name", ""] },
                                    " ",
                                    { $ifNull: ["$last_name", ""] }
                                ]
                            },
                            regex: safe,
                            options: "i"
                        }
                    }
                }
            ]

            const studentId = Number(search)
            if (Number.isInteger(studentId)) {
                searchOr.push({ _id: studentId })
            }
            andClauses.push({ $or: searchOr })
        }

        if (req.query.last_name){
            const safe = String(req.query.last_name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            andClauses.push({ last_name: new RegExp("^" + safe, "i") })
        }

        const filter = andClauses.length > 0 ? { $and: andClauses } : {}
        const { page, limit } = parsePage(req.query)

        const [students, total] = await Promise.all([
            Student.find(filter)
                .sort({last_name: 1, first_name: 1})
                .skip((page - 1) * limit)
                .limit(limit),
            Student.countDocuments(filter)
        ])

        res.status(200).json({page, limit, total, students})
    }
    catch(err){
        next(err)
    }
}

//GET id
export async function getStudent(req, res, next) {
    try{
        const id = parseID(req.params.id)

        if (id==null) return res.status(400).json({error: "Student id must be a number"})
        
        const student = await Student.findById(id)
        if (!student) return res.status(404).json({error: "Student not found"})

        res.status(200).json(student)
    }
    catch(err){
        next(err)
    }
}

//PUT
export async function updateStudent(req, res, next) {
    try{
        const id = parseID(req.params.id)
        if (id == null) return res.status(400).json({error: "Student id must be a number"})

        const changes = {}
        for (const field of ["first_name", "middle_name", "last_name", "sex", "birth_date"]){
            if (req.body[field] !== undefined) changes[field] = req.body[field]
        }
        if (req.body.address && typeof req.body.address === "object") {
            for (const field of ["street", "barangay", "city", "province"]){
                if (req.body.address[field] !== undefined){
                    changes[`address.${field}`] = req.body.address[field]
                }
            }
        }
        if (Object.keys(changes).length == 0){
            return res.status(400).json({error: "No valid fields to update"})
        }

        const updated = await Student.findByIdAndUpdate(
            id,
            { $set: changes},
            { new: true, runValidators: true}
        )

        if (!updated) return res.status(404).json({error: "Student not found"})
        res.status(200).json(updated)
    }
    catch(err){
        next(err)
    }
}

//DELETE
export async function deleteStudent(req, res, next) {
    try{
        const id = parseID(req.params.id)

        //Checks the relations and if they active
        if (id === null) return res.status(400).json({error: "Student id must be a number"})
 
        const student = await Student.findById(id)
        if (!student) return res.status(404).json({error: "Student not found"})
 
        if (await Enrollment.exists({ student: id })) {
            return res.status(409).json({error: "Cannot delete: this student has enrollments"})
        }
        if (await Block.exists({ students: id })) {
            return res.status(409).json({error: "Cannot delete: this student is in a block"})
        }
        if (await CourseEnrollment.exists({ student: id })) {
            return res.status(409).json({error: "Cannot delete: this student is Enrolled in a course"})
        }
        if (await CourseRecord.exists({ student: id })) {
            return res.status(409).json({error: "Cannot delete: this student has course record"})
        }
 
        await Student.findByIdAndDelete(id)
        res.status(200).json({message: "Student deleted", _id: id})

    }
    catch(err){
        next(err)
    }
    
}