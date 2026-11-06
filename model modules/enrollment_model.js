import mongoose from "mongoose";

const enrollmentSchema= new mongoose.Schema({
    student:        {type: mongoose.Schema.Types.Number, ref: "Student", required: true},
    approved_by:    {type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true},
    program:        { type: mongoose.Schema.Types.ObjectId, ref: "Program", required: true },
    semester:       { type: mongoose.Schema.Types.ObjectId, ref: "Semester", required: true },
    block:          { type: mongoose.Schema.Types.ObjectId, ref: "Block", required: true },
    standing_year: Number
})

enrollmentSchema.index({ student: 1, semester: 1 }, { unique: true })

const Enrollment = mongoose.model("Enrollment", enrollmentSchema)

export async function createEnrollment(req, res) {
    try{
        const newEnrollment = new Enrollment({
            student:        req.body.student,
            approved_by:    req.body.approved_by,
            program:        req.body.program,
            semester:       req.body.semester,
            block:          req.body.block,
            standing_year:  req.body.standing_year
        })
        const saved = await newEnrollment.save()
        res.status(201).json(saved)
    }
    catch(err){
        res.status(400).json({error:err.message})
    }
}

export default Enrollment