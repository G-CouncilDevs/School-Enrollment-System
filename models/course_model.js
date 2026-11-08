import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
    name:           {type: String, required: true},
    code:           {type: String, required: true, uppercase: true, trim: true, unique: true},
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

export default Course 