import Semester from "../models/semester_model.js"
import Employee from "../models/employee_model.js";
import Enrollment from "../models/enrollment_model.js";
import Block from "../models/block_model.js";
import mongoose from "mongoose";

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

//GET
export async function getEmployees(req, res) {
    try{
        const filter = {}
        if (req.query.last_name){
            const safe = String(req.query.last_name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            filter.last_name = new RegExp("^" + safe, "i")
        }

        const page = Math.max(parseInt(req.query.page) || 1, 1)
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100)

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
        res.status(500).json({error:err.message})
    }
}


//GET id
export async function getEmployee(req, res) {
    try{
        const id = req.params.id
        if(!mongoose.isValidObjectId(id)){
            return res.status(400).json({error: "Invalid employee ID"})
        }

        const employee = await Employee.findById(id)
        if (!employee) return res.status(404).json({error: "Employee not found"})
        
        res.status(200).json(employee)
    }
    catch(err){
        res.status(500).json({error:err.message})
    }
}

//PUT
export async function updateEmployee(req, res) {
    try{
        const id = req.params.id
        if(!mongoose.isValidObjectId(id)){
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
            { returnDocument: "after", runValidators: true}
        )

        if (!updated) return res.status(404).json({error: "Employee not found"})
        res.status(200).json(updated)
    }
    catch(err){
        res.status(400).json({error:err.message})
    }
}

export async function deleteEmployee(req, res) {
    try{
        const id = req.params.id
        if (!mongoose.isValidObjectId(id)) {
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
        res.status(500).json({error:err.message})
    }
}