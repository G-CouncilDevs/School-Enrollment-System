import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
    first_name: {type: String, required: true},
    middle_name:{type: String},
    last_name:  {type: String, required: true}
})

const Employee = mongoose.model("Employee", employeeSchema)

export async function createEmployee(req, res) {
    try{
        const newEmployee = new Employee({
        first_name:     req.body.first_name,
        middle_name:    req.body.middle_name,
        last_name:      req.body.last_name
        })
        const saved = await newEmployee.save()
        res.status(201).json(saved)
    }
    catch (err){
        res.status(400).json({error:err.message})
    }
}

export default Employee
