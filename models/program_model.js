import mongoose from "mongoose";

const programSchema = new mongoose.Schema({
    name:   {type: String, required: true},
    major:  {type: String},
    courses: [{
        _id: false,
        course:    {type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true},
        year_level: {type: Number, required: true}
    }]
})

const Program = mongoose.model("Program", programSchema)

export default Program