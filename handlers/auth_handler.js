import Employee from "../models/employee_model.js";
import { verifyPassword } from "../utils/password.js";

function employeeResponse(employee) {
  return {
    _id: employee._id,
    first_name: employee.first_name,
    middle_name: employee.middle_name,
    last_name: employee.last_name,
    email: employee.email,
  };
}

export async function loginEmployee(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const employee = await Employee.findOne({ email }).select("+password_hash");
    if (!employee || !(await verifyPassword(password, employee.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    req.session.regenerate((error) => {
      if (error) {
        console.error("Failed to regenerate login session:", error);
        return res.status(500).json({ error: "Unable to sign in" });
      }

      req.session.employeeId = employee._id.toString();
      res.status(200).json({ employee: employeeResponse(employee) });
    });
  } catch (error) {
    console.error("Failed to sign in employee:", error);
    res.status(500).json({ error: "Unable to sign in" });
  }
}

export function logoutEmployee(req, res) {
  req.session.destroy((error) => {
    if (error) {
      console.error("Failed to destroy login session:", error);
      return res.status(500).json({ error: "Unable to sign out" });
    }

    res.clearCookie("connect.sid");
    res.status(204).end();
  });
}

export async function getCurrentEmployee(req, res) {
  try {
    if (!req.session.employeeId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const employee = await Employee.findById(req.session.employeeId);
    if (!employee) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Authentication required" });
    }

    res.status(200).json({ employee: employeeResponse(employee) });
  } catch (error) {
    console.error("Failed to load current employee:", error);
    res.status(500).json({ error: "Unable to load current employee" });
  }
}
