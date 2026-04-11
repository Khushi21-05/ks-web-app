const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const connectDB = require("./db/db");
const customerRoutes = require("./routes/customerRoutes");

// connect to database
connectDB();

const app = express();

// middleware
app.use(express.json());
app.use(cors());

//API
app.use("/api/customers", customerRoutes);
app.get("/",(req,res)=>{
    res.send("Hello World");
    console.log("Hello World");
})





module.exports = app;