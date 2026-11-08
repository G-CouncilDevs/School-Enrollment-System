import express from "express";
import {
    createBlock,
    getBlocks,
} from "../handlers/block_handler.js";

const router = express.Router();

router.post("/", createBlock);
router.get("/", getBlocks);

export default router;
