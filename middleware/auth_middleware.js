import mongoose from "mongoose";
import Employee from "../models/employee_model.js";

export async function requireAuth(req, res, next) {
  const employeeId = req.session.employeeId;

  if (!employeeId || !mongoose.isValidObjectId(employeeId)) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const employee = await Employee.exists({ _id: employeeId });
    if (!employee) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Authentication required" });
    }

    next();
  } catch (error) {
    console.error("Failed to validate employee session:", error);
    res.status(500).json({ error: "Unable to validate authentication" });
  }
}
