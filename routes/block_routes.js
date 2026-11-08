import express from "express";
import { createBlock } from "../handlers/block_handler.js";

const router = express.Router();

router.post("/", createBlock);

export default router;
