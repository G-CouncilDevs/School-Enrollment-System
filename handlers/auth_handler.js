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

export async function loginEmployee(req, res, next) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const employee = await Employee.findOne({ email }).select("+password_hash");
    if (!employee || !(await verifyPassword(password, employee.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    req.session.regenerate((error) => {
      if (error) {
        return next(error);
      }

      req.session.employeeId = employee._id.toString();
      res.status(200).json({ employee: employeeResponse(employee) });
    });
  } catch (error) {
    next(error);
  }
}

export function logoutEmployee(req, res, next) {
  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    res.clearCookie("connect.sid");
    res.status(204).end();
  });
}

export async function getCurrentEmployee(req, res, next) {
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
    next(error);
  }
}
