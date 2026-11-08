import express from "express";
import {
    createCourse,
    getCourses,
    updateCourse,
    deleteCourse,
} from "../handlers/course_handler.js";

const router = express.Router();

router.post("/", createCourse);
router.get("/", getCourses);
router.put("/:id", updateCourse);
router.delete("/:id", deleteCourse);

export default router;
