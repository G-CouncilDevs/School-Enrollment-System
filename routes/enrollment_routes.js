import express from "express";
import { createEnrollment } from "../handlers/enrollment_handler.js";

const router = express.Router();

router.post("/", createEnrollment);

export default router;
