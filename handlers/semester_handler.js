import Semester from "../models/semester_model.js"
import mongoose from "mongoose";

//POST
export async function createSemester(req, res) {
    try{
        const newSemester = new Semester({
            semester_term:   req.body.semester_term,
            academic_year:  req.body.academic_year,
            offerings:  req.body.offerings
        })
        const saved = await newSemester.save()
        res.status(201).json(saved)
    } catch(err){
        if (err.code === 11000) {
            return res.status(409).json({error: "That term already exists for this academic year"})
        }
        res.status(400).json({error:err.message})
    }
}

export async function getSemesters(req, res) {
    try {
        const filter = {};
        if (req.query.academic_year !== undefined) {
            const academicYear = Number(req.query.academic_year);
            if (!Number.isInteger(academicYear)) {
                return res.status(400).json({error: "academic_year must be an integer"});
            }
            filter.academic_year = academicYear;
        }
        if (req.query.semester_term) {
            filter.semester_term = req.query.semester_term;
        }

        const semesters = await Semester.find(filter)
            .sort({academic_year: -1, semester_term: 1});
        res.status(200).json(semesters);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
}

export async function getSemester(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({error: "Invalid semester id"});
        }
        const semester = await Semester.findById(req.params.id);
        if (!semester) return res.status(404).json({error: "Semester not found"});
        res.status(200).json(semester);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
}