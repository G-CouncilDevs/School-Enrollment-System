import Course from "../models/course_model.js";

export async function createCourse(req, res) {
    try{
        const newCourse = new Course({
            name:           req.body.name,
            units:          req.body.units,
            prerequisites:  req.body.prerequisites
        })
        const saved = await newCourse.save()
        res.status(201).json(saved)
    }
    catch (err){
        res.status(400).json({error:err.message})
    }
}