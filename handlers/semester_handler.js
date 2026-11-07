import Semester from "../models/semester_model.js"

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