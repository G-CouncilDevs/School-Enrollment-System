import express from "express";
import { createProgram } from "../handlers/program_handler.js";

const router = express.Router();

router.post("/", createProgram);

export default router;
