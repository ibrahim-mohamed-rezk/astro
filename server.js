import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname } from "path";
import studentsRouter from "./routes/students.js";
import badgesRouter from "./routes/badges.js";
import attendanceRouter from "./routes/attendance.js";
import dotenv from "dotenv";
dotenv.config();

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static("public/uploads"));

// MongoDB Connection with Atlas 
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Atlas connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

connectDB();

// Routes
app.use("/api/students", studentsRouter);
app.use("/api/badges", badgesRouter);
app.use("/api/attendance", attendanceRouter);


// Serve HTML
app.get("/api/", (req, res) => {
  res.json({
    message: "hello world",
  });
});

const PORT = process.env.PORT || 9000; 
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
