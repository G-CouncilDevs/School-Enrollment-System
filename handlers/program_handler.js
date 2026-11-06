import Program from "../models/program_model.js";

export async function createProgram(req, res) {
    try{
        const newProgram = new Program({
            name:   req.body.name,
            major:  req.body.major,
            courses: req.body.courses
        })
        const saved = await newProgram.save()
        res.status(201).json(saved)
    }
    catch(err){
        res.status(400).json({error:err.message})
    }
}