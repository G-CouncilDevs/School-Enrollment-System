import express from "express";
import {
    createProgram,
    getPrograms,
} from "../handlers/program_handler.js";

const router = express.Router();

router.post("/", createProgram);
router.get("/", getPrograms);

export default router;
