import express from "express";
import {
  getCurrentEmployee,
  loginEmployee,
  logoutEmployee,
} from "../handlers/auth_handler.js";

const router = express.Router();

router.post("/login", loginEmployee);
router.post("/logout", logoutEmployee);
router.get("/me", getCurrentEmployee);

export default router;
