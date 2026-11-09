import { connectToMongoDB, disconnectFromMongoDB } from "../DB.js";
import Employee from "../models/employee_model.js";
import { hashPassword } from "../utils/password.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
}

await connectToMongoDB();

try {
  const existing = await Employee.findOne({ email }).select("+password_hash");
  if (existing) {
    throw new Error(`Employee with email ${email} already exists`);
  }

  const employee = await Employee.create({
    first_name: "John",
    last_name: "Doe",
    email,
    password_hash: await hashPassword(password),
  });

  console.log(`Created employee ${employee.first_name} ${employee.last_name}`);
} finally {
  await disconnectFromMongoDB();
}
