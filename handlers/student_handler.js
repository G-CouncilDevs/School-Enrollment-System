import Student from "../models/student_model.js";
import Enrollment from "../models/enrollment_model.js"
import Block from "../models/block_model.js";
import { nextStudentID } from "../models/studentID_generator.js";

// Since MonggoDB passes the special ID to a String, this parses it into a Number
function parseID(raw){
    const id = Number(raw)
    return Number.isInteger(id) ? id : null
}

//POST
export async function createStudent(req, res) {
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
        res.status(400).json({error:err.message})
    }
}

//GET
export async function getStudents(req, res) {
    try{
        const filter = {}
        if (req.query.student_id !== undefined) {
            const id = parseID(req.query.student_id)
            if (id === null) {
                return res.status(400).json({error: "student_id must be a number"})
            }
            filter._id = id
        }
        if(req.query.last_name){
            const safe = String(req.query.last_name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            const expression = new RegExp(safe, "i")
            filter.$or = [
                {first_name: expression},
                {last_name: expression},
            ]
        }
        //Amount of things that get displayed, pagination
        const page = Math.max(parseInt(req.query.page) || 1, 1)
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100)
        //The display
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
        res.status(500).json({error:err.message})
    }
}

//GET id
export async function getStudent(req, res) {
    try{
        const id = parseID(req.params.id)

        if (id==null) return res.status(400).json({error: "Student id must be a number"})
        
        const student = await Student.findById(id)
        if (!student) return res.status(404).json({error: "Student not found"})

        res.status(200).json(student)
    }
    catch(err){
        res.status(500).json({error: err.message})
    }
}

//PUT
export async function updateStudent(req, res) {
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
        res.status(400).json({error: err.message})
    }
}

//DELETE
export async function deleteStudent(req, res) {
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
 
        await Student.findByIdAndDelete(id)
        res.status(200).json({message: "Student deleted", _id: id})

    }
    catch(err){
        res.status(500).json({error: err.message})
    }
    
}