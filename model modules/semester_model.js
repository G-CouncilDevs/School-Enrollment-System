import mongoose from "mongoose";

const semesterSchema = new mongoose.Schema({
    term:           {type: String, enum: ["1st", "2nd", "3rd"], trim: true, required: true,},
    academic_year:  {type: Number, required: true},
    offerings:      [{
        _id: false,
        course:         {type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true},
        course_active:  {type: Boolean,  default: true}
    }]  
})

semesterSchema.index({ academic_year: 1, term: 1 }, { unique: true })

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
        if (err.code === 11000) {
        return res.status(409).json({error: "That term already exists for this academic year"})
    }
        res.status(400).json({error:err.message})
    }
}

export default Semester