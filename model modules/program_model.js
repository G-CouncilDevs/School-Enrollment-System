import { request } from "express";
import mongoose from "mongoose";

const programSchema = new mongoose.Schema({
    name:   {type: String, required: true},
    major:  {type: String, required: true},
    courses: [{
        _id: false,
        courses:    {type: mongoose.Schema.Types.ObjectId, ref: "Courses", required: true},
        year_level: {type: Number, required: true}
    }]
})

const Program = mongoose.model("Program", programSchema)

export async function createProgram(req, res) {
    try{
        const newProgram = new Program({
            name:   req.body.name,
            major:  req.body.major,
            courses: req.body.courses
        })
        const saved = await newCourse.save()
        res.status(201).json(saved)
    }
    catch(err){
        res.status(400).json({error:err.message})
    }
}

export default Program