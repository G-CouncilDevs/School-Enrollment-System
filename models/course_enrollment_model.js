import mongoose from "mongoose";

const courseEnrollmentSchema = new mongoose.Schema({
    student:    {type: Number, ref: "Student", required: true},
    enrollment: {type: mongoose.Schema.Types.ObjectId, ref: "Enrollment", required: true},
    semester:   {type: mongoose.Schema.Types.ObjectId, ref: "Semester", required: true},
    course:     {type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true},
    block:      {type: mongoose.Schema.Types.ObjectId, ref:"Block", required: true},
    source:     {type: String, enum: ["block", "prerequisite"], default: "block"}
}, { timestamps: true })

courseEnrollmentSchema.index({ student: 1, semester: 1, course: 1 }, { unique: true })
courseEnrollmentSchema.index({ enrollment: 1 })
courseEnrollmentSchema.index({ semester: 1, course: 1 })

const CourseEnrollment = mongoose.model("CourseEnrollment", courseEnrollmentSchema)

export default CourseEnrollment