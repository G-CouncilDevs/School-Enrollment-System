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

export async function createBlock(req, res) {
    try{
        const newBlock = new Block({
            semester:   req.body.semester,
            section_name:   req.body.section_name,
            courses:    req.body.courses,
            students:   req.body.students
        })
        const saved = await newBlock.save()
        res.status(201).json(saved)
    }
    catch(err){
        if (err.code === 11000) {
            return res.status(409).json({error: "That section already exists for this semester"})
    }
        res.status(400).json({error:err.message})
    }
}

export default Block