import express from "express";
import {
    createSemester,
    getSemesters,
} from "../handlers/semester_handler.js";

const router = express.Router();

router.post("/", createSemester);
router.get("/", getSemesters);

export default router;
