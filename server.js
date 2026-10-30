const express = require("express")
const mongoose = require("mongoose")

const app = express()

app.use(express.json())

app.use(express.static("client"))

app.get("/", (req, res) =>{
    res.send("WAGGGHHHH!!!")
})

app.listen(3000, ()=>{
    console.log("Server is running on Port 3000")
})