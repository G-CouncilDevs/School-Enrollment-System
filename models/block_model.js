import mongoose from "mongoose";

const blockSchema = new mongoose.Schema({
    semester:       {type: mongoose.Schema.Types.ObjectId, ref: "Semester", required: true},
    section_name:   {type: String, required: true},
    courses:    [{
        _id:false,
        course:    {type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true},
        employee:   {type: mongoose.Schema.Types.ObjectId, ref: "Employee"},
        schedule:   {type: String},
        room:       {type: String}
    }],
    students:   [{type: Number, ref:"Student"}]
})

blockSchema.index({ semester: 1, section_name: 1 }, { unique: true })
blockSchema.index({ students: 1 })

const Block = mongoose.model("Block", blockSchema)

export default Block