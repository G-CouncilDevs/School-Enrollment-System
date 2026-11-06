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

export default Enrollment