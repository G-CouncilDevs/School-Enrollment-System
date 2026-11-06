import Student from "../models/student.js";
import { nextStudentID } from "../models/studentID_generator.js";

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