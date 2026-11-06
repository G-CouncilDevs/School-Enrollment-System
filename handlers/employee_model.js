import Employee from "../models/employee_model.js";

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