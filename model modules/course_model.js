import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
    name:           {type: String, required: true},
    units:          {type: Number, required: true},
    prerequisites:  {
        type: [{type: mongoose.Schema.Types.ObjectId, ref: "Course"}],
        validate: {
            validator: function (list) {
                return !list.some(id => id.equals(this.id))
            },
            message: "A course cannot be its own prerequisite"
        }
    }
})

const Course = mongoose.model("Course", courseSchema)

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

export default Course