import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
    _id:        {type: Number, required: true},
    first_name: {type: String, required: true},
    middle_name:{type: String},
    last_name:  {type: String, required: true},
    sex:        {type: String, enum: ["Male", "Female"]},
    birth_date: Date,
    address:    {
        street:     String,
        barangay:   String,
        city:       String,
        province:   String
    }
})

const Student = mongoose.model("Student", studentSchema)

export default Student