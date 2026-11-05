import mongoose from "mongoose";

const enrollmentSchema= new mongoose.Schema({
    student:        {type: mongoose.Schema.Types.ObjectId, ref: "Student", required: True},
    approved_by:    {type: mongoose.Schema.Types.ObjectId, ref: "Empolyee", required: True},
    program:        { type: mongoose.Schema.Types.ObjectId, ref: "Program" },
    semester:       { type: mongoose.Schema.Types.ObjectId, ref: "Semester" },
    block:          { type: mongoose.Schema.Types.ObjectId, ref: "Block" },
    standing_year: Number
})

const Enrollment = mongoose.model("Enrollment", enrollmentSchema)

export async function createEnrollment(req, res) {
    try{
        const newEnrollment = new Enrollment({
            student:        req.body.student,
            approved_by:    req.body.approved_by,
            program:        req.body.program,
            semester:       req.body.semester,
            block:          req.body.block
        })
        const saved = await newEnrollment.save()
        res.status(201).json(saved)
    }
    catch(err){
        res.status(400).json({error:err.message})
    }
}
