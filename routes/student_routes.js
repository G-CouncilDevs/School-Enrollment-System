import express from "express";
import { createStudent } from "../handlers/student_handler.js";

const router = express.Router();

router.post("/", createStudent);

export default router;
