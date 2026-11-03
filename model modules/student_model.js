import mongoose from "mongoose";
import { nextStudentID } from "./studentID_generator";

const studentSchema = new mongoose.Schema({
    _id:        {type: String, required: true},
    first_name: {type: String, required: true},
    middle_name:{type: String, required: true},
    last_name:  {type: String, required: true},
    sex:        {type: String, enum: ["Male", "Female"]},
    birth_date: Date,
    address:    {
        street:     String,
        barangay:   String,
        city:       String,
        province:   String
    }
})

const Student = mongoose.model("Student", studentSchema)

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