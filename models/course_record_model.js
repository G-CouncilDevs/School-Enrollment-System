import mongoose from "mongoose";

const courseRecordSchema = new mongoose.Schema({
    student:   {type: Number, ref: "Student", required: true},
    course:    {type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true},
    semester:  {type: mongoose.Schema.Types.ObjectId, ref: "Semester"},
    status:    {type: String, enum: ["passed", "failed", "in_progress"], required: true},
    grade:     {type: Number}
}, { timestamps: true })

courseRecordSchema.index({ student: 1, course: 1, semester: 1 }, { unique: true })
courseRecordSchema.index({ student: 1, status: 1 })

const CourseRecord = mongoose.model("CourseRecord", courseRecordSchema)

export default CourseRecord