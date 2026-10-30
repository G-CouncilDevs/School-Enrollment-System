import { connectToMongoDB, disconnectFromMongoDB } from "./DB.js"
import express from "express"

const app = express()
app.use(express.json())

app.use(express.static("client"))

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

