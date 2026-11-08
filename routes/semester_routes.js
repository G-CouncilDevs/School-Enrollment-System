import express from "express";
import { createSemester } from "../handlers/semester_handler.js";

const router = express.Router();

router.post("/", createSemester);

export default router;
