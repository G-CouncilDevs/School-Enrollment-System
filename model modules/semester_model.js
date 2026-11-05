import mongoose from "mongoose";

const semesterSchema = new mongoose.Schema({
    term:           {type: String, required: True},
    academic_year:  {type: Number, required: True},
    offerings:      [{
        _id: false,
        course:         {type: mongoose.Schema.Types.ObjectId, ref: "Courses", required: True},
        course_active:  {type: Boolean,  required: True}
    }]  
})

const Semester = mongoose.model("Semester", semesterSchema)

export async function createSemester(req, res) {
    try{
        const newSemester = new Semester({
            term:   req.body.term,
            academic_year:  req.body.academic_year,
            offerings:  req.body.offerings
        })
        const saved = await newSemester.save()
        res.status(201).json(saved)
    }
    catch(err){
        res.status(400).json({error:err.message})
    }
}