import { connectToMongoDB, disconnectFromMongoDB } from "./DB.js"
import express from "express"
import studentRoutes from "./routes/student_routes.js"
import enrollmentRoutes from "./routes/enrollment_routes.js"
import courseRoutes from "./routes/course_routes.js"
import employeeRoutes from "./routes/employee_routes.js"
import programRoutes from "./routes/program_routes.js"
import semesterRoutes from "./routes/semester_routes.js"
import blockRoutes from "./routes/block_routes.js"

const app = express()
app.use(express.json())

app.use(express.static("client"))

app.use("/api/students", studentRoutes)
app.use("/api/enrollments", enrollmentRoutes)
app.use("/api/courses", courseRoutes)
app.use("/api/employees", employeeRoutes)
app.use("/api/programs", programRoutes)
app.use("/api/semesters", semesterRoutes)
app.use("/api/blocks", blockRoutes)

app.get("/", (req, res) =>{
    res.send("WAGGGHHHH!!!")
})

async function start() {
    await connectToMongoDB();
    app.listen(3000, () => console.log("Server is running on Port 3000"));
}

start().catch((err) =>{
    console.error("Failed to Start:", err);
    process.exit(1);
});