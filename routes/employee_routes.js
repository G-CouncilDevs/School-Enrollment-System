import express from "express";
import { createEmployee } from "../handlers/employee_handler.js";

const router = express.Router();

router.post("/", createEmployee);

export default router;
