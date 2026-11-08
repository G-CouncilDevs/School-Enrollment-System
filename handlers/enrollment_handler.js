import Enrollment from "../models/enrollment_model.js";
import mongoose from "mongoose";

export async function createEnrollment(req, res) {
    try{
        const newEnrollment = new Enrollment({
            student:        req.body.student,
            approved_by:    req.body.approved_by,
            program:        req.body.program,
            semester:       req.body.semester,
            block:          req.body.block,
            standing_year:  req.body.standing_year
        })
        const saved = await newEnrollment.save()
        res.status(201).json(saved)
    } catch(err){
        if (err.code === 11000) {
            return res.status(409).json({error: "This student is already enrolled for this semester"})
        }
        res.status(400).json({error:err.message})
    }
}

export async function getEnrollments(req, res) {
    try {
        const filter = {};
        if (req.query.student !== undefined) {
            const student = Number(req.query.student);
            if (!Number.isInteger(student)) {
                return res.status(400).json({error: "student must be a number"});
            }
            filter.student = student;
        }
        for (const field of ["approved_by", "program", "semester", "block"]) {
            if (req.query[field] !== undefined) {
                if (!mongoose.isValidObjectId(req.query[field])) {
                    return res.status(400).json({error: `Invalid ${field} id`});
                }
                filter[field] = req.query[field];
            }
        }

        const enrollments = await Enrollment.find(filter)
            .sort({createdAt: -1})
            .populate("approved_by")
            .populate("program")
            .populate("semester")
            .populate("block");
        res.status(200).json(enrollments);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
}

export async function getEnrollment(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({error: "Invalid enrollment id"});
        }
        const enrollment = await Enrollment.findById(req.params.id)
            .populate("approved_by")
            .populate("program")
            .populate("semester")
            .populate("block");
        if (!enrollment) return res.status(404).json({error: "Enrollment not found"});
        res.status(200).json(enrollment);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
}

export async function updateEnrollment(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({error: "Invalid enrollment id"});
        }

        const changes = {};
        for (const field of ["approved_by", "program", "semester", "block", "standing_year"]) {
            if (req.body[field] !== undefined) changes[field] = req.body[field];
        }
        if (req.body.student !== undefined) {
            const student = Number(req.body.student);
            if (!Number.isInteger(student)) {
                return res.status(400).json({error: "student must be a number"});
            }
            changes.student = student;
        }
        if (Object.keys(changes).length === 0) {
            return res.status(400).json({error: "No valid fields to update"});
        }

        const updated = await Enrollment.findByIdAndUpdate(
            req.params.id,
            {$set: changes},
            {new: true, runValidators: true},
        );
        if (!updated) return res.status(404).json({error: "Enrollment not found"});
        res.status(200).json(updated);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({error: "This student is already enrolled for this semester"});
        }
        res.status(400).json({error: err.message});
    }
}

export async function deleteEnrollment(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({error: "Invalid enrollment id"});
        }
        const deleted = await Enrollment.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({error: "Enrollment not found"});
        res.status(200).json({message: "Enrollment deleted", _id: req.params.id});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
}