import express from "express";
import { createCourse } from "../handlers/course_handler.js";

const router = express.Router();

router.post("/", createCourse);

export default router;
