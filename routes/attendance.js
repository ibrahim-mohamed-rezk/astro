// routes/attendance.js
import express from "express";
import AttendanceController from "../controllers/attendanceController.js";

const router = express.Router();

// Get attendance statistics for a student (put this before /:attendanceId to avoid conflicts)
router.get("/:id/attendance/stats", AttendanceController.getAttendanceStats);

// Get all attendance records for a student
router.get("/:id/attendance", AttendanceController.getAllAttendance);

// Get specific attendance record
router.get("/:id/attendance/:attendanceId", AttendanceController.getAttendanceById);

// Create new attendance record
router.post("/:id/attendance", AttendanceController.createAttendance);

// Update attendance record
router.put("/:id/attendance/:attendanceId", AttendanceController.updateAttendance);

// Delete attendance record
router.delete("/:id/attendance/:attendanceId", AttendanceController.deleteAttendance);

export default router;