import Employee from "../models/employee_model.js";
import Enrollment from "../models/enrollment_model.js";
import Block from "../models/block_model.js";
import { hashPassword } from "../utils/password.js";
import { isId } from "../utils/validate.js";
import { parsePage } from "../utils/pagination.js";

export async function createEmployee(req, res, next) {
    try{
        const { first_name, middle_name, last_name, email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: "email and password are required" })
        }

        const password_hash = await hashPassword(String(password))

        const newEmployee = new Employee({
            first_name,
            middle_name,
            last_name,
            email:         String(email).trim().toLowerCase(),
            password_hash
        })
        const saved = await newEmployee.save()
        // Never return password_hash in the response
        const { password_hash: _removed, ...safeEmployee } = saved.toObject()
        res.status(201).json(safeEmployee)
    }
    catch (err){
        if (err.code === 11000) {
            return res.status(409).json({ error: "An employee with that email already exists" })
        }
        next(err)
    }
}

//GET
export async function getEmployees(req, res, next) {
    try{
        const filter = {}
        if (req.query.last_name){
            const safe = String(req.query.last_name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            filter.last_name = new RegExp("^" + safe, "i")
        }

        const { page, limit } = parsePage(req.query)

        const [employees, total] = await Promise.all([
            Employee.find(filter)
                .sort({last_name: 1, first_name: 1})
                .skip((page - 1) * limit)
                .limit(limit),
            Employee.countDocuments(filter)
        ])
        res.status(200).json({page, limit, total, employees})
    }
    catch(err){
        next(err)
    }
}


//GET id
export async function getEmployee(req, res, next) {
    try{
        const id = req.params.id
        if(!isId(id)){
            return res.status(400).json({error: "Invalid employee ID"})
        }

        const employee = await Employee.findById(id)
        if (!employee) return res.status(404).json({error: "Employee not found"})
        
        res.status(200).json(employee)
    }
    catch(err){
        next(err)
    }
}

//PUT
export async function updateEmployee(req, res, next) {
    try{
        const id = req.params.id
        if(!isId(id)){
            return res.status(400).json({error: "Invalid employee ID"})
        }

        const changes = {}
        for (const field of ["first_name", "middle_name", "last_name"]){
            if (req.body[field] !== undefined) changes[field] = req.body[field]
        }

        if (Object.keys(changes).length == 0){
            return res.status(400).json({error: "No valid fields to update"})
        }

        const updated = await Employee.findByIdAndUpdate(
            id,
            { $set: changes},
            { new: true, runValidators: true}
        )

        if (!updated) return res.status(404).json({error: "Employee not found"})
        res.status(200).json(updated)
    }
    catch(err){
        next(err)
    }
}

//DELETE
export async function deleteEmployee(req, res, next) {
    try{
        const id = req.params.id
        if (!isId(id)) {
            return res.status(400).json({error: "Invalid employee id"})
        }

        const employee = await Employee.findById(id)
        if (!employee) return res.status(404).json({error: "Employee not found"})

        if (await Enrollment.exists({ approved_by: id })) {
            return res.status(409).json({error: "Cannot delete: this employee approved enrollments"})
        }
        if (await Block.exists({ "courses.employee": id })) {
            return res.status(409).json({error: "Cannot delete: this employee teaches in a block"})
        }

        await Employee.findByIdAndDelete(id)
        res.status(200).json({message: "Employee deleted", _id: id})
    }
    catch (err){
        next(err)
    }
}