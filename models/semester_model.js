import mongoose from "mongoose";

const semesterSchema = new mongoose.Schema({
    semester_term:  {type: String, enum: ["1st", "2nd", "3rd"], trim: true, required: true,},
    academic_year:  {type: Number, required: true},
    offerings:      [{
        _id: false,
        course:         {type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true},
        course_active:  {type: Boolean,  default: true}
    }]  
})

semesterSchema.index({ academic_year: 1, semester_term: 1 }, { unique: true })

const Semester = mongoose.model("Semester", semesterSchema)

export default Semester