import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
    name:           {type: String, required: true},
    units:          {type: Number, required: true},
    prerequisites:  {type: String, required: true}
})

const Courses = mongoose.model("Courses", courseSchema)

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

export default Courses