import express from "express";
import {
    createStudent,
    getStudents,
    updateStudent,
    deleteStudent,
} from "../handlers/student_handler.js";

const router = express.Router();

router.post("/", createStudent);
router.get("/", getStudents);
router.put("/:id", updateStudent);
router.delete("/:id", deleteStudent);

export default router;
