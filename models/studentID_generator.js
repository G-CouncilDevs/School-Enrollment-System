import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
    _id: String,
    seq: {type: Number, default: 0}
})

const Counter = mongoose.model("Counter", counterSchema)

export async function nextStudentID() {
    const year = new Date().getFullYear()

    const counter = await Counter.findByIdAndUpdate(
        `student-${year}`,
        {$inc: {seq: 1}},
        {returnDocument: "after", upsert: true}
    )
    return  year * 1000000 + counter.seq
}

export default Counter