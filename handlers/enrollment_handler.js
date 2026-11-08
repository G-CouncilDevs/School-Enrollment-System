import Enrollment from "../models/enrollment_model.js";

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
        if (err.code === 11000) {
            return res.status(409).json({error: "This student is already enrolled for this semester"})
    }
        res.status(400).json({error:err.message})
    }
}