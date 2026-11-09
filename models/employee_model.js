import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
    first_name: {type: String, required: true},
    middle_name:{type: String},
    last_name:  {type: String, required: true},
    email:      {type: String, required: true, unique: true, lowercase: true, trim: true},
    password_hash: {type: String, required: true, select: false}
})

const Employee = mongoose.model("Employee", employeeSchema)

export default Employee
