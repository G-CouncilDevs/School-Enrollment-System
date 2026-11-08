import express from "express";
import {
    createEnrollment,
    getEnrollments,
    deleteEnrollment,
} from "../handlers/enrollment_handler.js";

const router = express.Router();

router.post("/", createEnrollment);
router.get("/", getEnrollments);
router.delete("/:id", deleteEnrollment);

export default router;
