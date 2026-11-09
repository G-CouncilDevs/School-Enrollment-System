import express from "express";
import {
    createEnrollment,
    getEnrollments,
    getEnrollment,
    updateEnrollment,
    deleteEnrollment,
} from "../handlers/enrollment_handler.js";

const router = express.Router();

router.post("/", createEnrollment);
router.get("/", getEnrollments);
router.get("/:id", getEnrollment);
router.put("/:id", updateEnrollment);
router.delete("/:id", deleteEnrollment);

export default router;
