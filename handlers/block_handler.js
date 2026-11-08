import Block from "../models/block_model.js";
import mongoose from "mongoose";

export async function createBlock(req, res) {
    try{
        const newBlock = new Block({
            semester:   req.body.semester,
            section_name:   req.body.section_name,
            courses:    req.body.courses,
            students:   req.body.students
        })
        const saved = await newBlock.save()
        res.status(201).json(saved)
    } catch(err){
        if (err.code === 11000) {
            return res.status(409).json({error: "That section already exists for this semester"})
        }
        res.status(400).json({error:err.message})
    }
}

export async function getBlocks(req, res) {
    try {
        const filter = {};
        if (req.query.semester !== undefined) {
            if (!mongoose.isValidObjectId(req.query.semester)) {
                return res.status(400).json({error: "Invalid semester id"});
            }
            filter.semester = req.query.semester;
        }
        const blocks = await Block.find(filter)
            .sort({section_name: 1})
            .populate("semester")
            .populate("courses.course")
            .populate("courses.employee");
        res.status(200).json(blocks);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
}

export async function getBlock(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({error: "Invalid block id"});
        }
        const block = await Block.findById(req.params.id)
            .populate("semester")
            .populate("courses.course")
            .populate("courses.employee");
        if (!block) return res.status(404).json({error: "Block not found"});
        res.status(200).json(block);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
}