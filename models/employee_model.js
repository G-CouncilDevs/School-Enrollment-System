import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
    first_name: {type: String, required: true},
    middle_name:{type: String},
    last_name:  {type: String, required: true}
})

const Employee = mongoose.model("Employee", employeeSchema)

export default Employee
