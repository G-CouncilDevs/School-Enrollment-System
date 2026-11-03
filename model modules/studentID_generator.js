import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
    _id: String,
    seq: {type: Number, default: 0}
})

const counter = mongoose.model("Counter", counterSchema)

export async function nextStudentID() {
    const year = new Date().getFullYear()

    const counter = await Counter.findByIdAndUpdate(
        `student-${year}`,
        {$inc: {seq: 1}},
        {new: true, upsert: true}
    )
    return  `${year}${String(counter.seq).padStart(6,"0")}`
}

export default Counter