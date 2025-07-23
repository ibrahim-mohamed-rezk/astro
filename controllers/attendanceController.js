// controllers/attendanceController.js
import AttendanceService from "../services/attendanceService.js";

class AttendanceController {
  // Get all attendance records for a student
  static async getAllAttendance(req, res) {
    try {
      const { id } = req.params;
      const filters = {
        month: req.query.month,
        week: req.query.week,
        status: req.query.status
      };

      const attendance = await AttendanceService.getAllAttendance(id, filters);

      res.json({
        status: "success",
        message: "Attendance records retrieved successfully",
        data: attendance,
      });
    } catch (error) {
      const statusCode = error.message.includes("Invalid student ID") || 
                        error.message.includes("Student not found") ? 404 : 500;
      
      res.status(statusCode).json({
        status: "error",
        message: `Failed to retrieve attendance for student with ID: ${req.params.id}`,
        error: error.message,
      });
    }
  }

  // Get specific attendance record
  static async getAttendanceById(req, res) {
    try {
      const { id, attendanceId } = req.params;
      const attendance = await AttendanceService.getAttendanceById(id, attendanceId);

      res.json({
        status: "success",
        message: "Attendance record retrieved successfully",
        data: attendance,
      });
    } catch (error) {
      const statusCode = error.message.includes("not found") ? 404 : 500;
      
      res.status(statusCode).json({
        status: "error",
        message: `Failed to retrieve attendance record with ID: ${req.params.attendanceId} for student with ID: ${req.params.id}`,
        error: error.message,
      });
    }
  }

  // Create new attendance record
  static async createAttendance(req, res) {
    try {
      const { id } = req.params;
      const attendanceData = req.body;

      const student = await AttendanceService.createAttendance(id, attendanceData);

      res.status(201).json({
        status: "success",
        message: "Attendance record added successfully",
        data: student,
      });
    } catch (error) {
      let statusCode = 400;
      if (error.message.includes("Student not found") || error.message.includes("Invalid student ID")) {
        statusCode = 404;
      }

      // Format Mongoose validation errors
      let formattedError = error.message;
      if (error.name === "ValidationError" && error.errors) {
        const attendanceErrors = Object.entries(error.errors)
          .filter(([key]) => key.startsWith("attendance"))
          .map(([key, err]) => `${key}: ${err.message}`)
          .join(", ");
        if (attendanceErrors) {
          formattedError = `Student validation failed: ${attendanceErrors}`;
        }
      }

      res.status(statusCode).json({
        status: "error",
        message: `Failed to add attendance to student with ID: ${req.params.id}. Please check the input data.`,
        error: formattedError,
      });
    }
  }

  // Update attendance record
  static async updateAttendance(req, res) {
    try {
      const { id, attendanceId } = req.params;
      const updateData = req.body;

      const student = await AttendanceService.updateAttendance(id, attendanceId, updateData);

      res.json({
        status: "success",
        message: `Attendance record with ID: ${attendanceId} updated successfully for student with ID: ${id}`,
        data: student,
      });
    } catch (error) {
      let statusCode = 400;
      if (error.message.includes("not found")) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        status: "error",
        message: `Failed to update attendance with ID: ${req.params.attendanceId} for student with ID: ${req.params.id}. Please check the input data.`,
        error: error.message,
      });
    }
  }

  // Delete attendance record
  static async deleteAttendance(req, res) {
    try {
      const { id, attendanceId } = req.params;
      const student = await AttendanceService.deleteAttendance(id, attendanceId);

      res.json({
        status: "success",
        message: `Attendance record with ID: ${attendanceId} deleted successfully from student with ID: ${id}`,
        data: student,
      });
    } catch (error) {
      let statusCode = 400;
      if (error.message.includes("not found")) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        status: "error",
        message: `Failed to delete attendance record with ID: ${req.params.attendanceId} from student with ID: ${req.params.id}.`,
        error: error.message,
      });
    }
  }

  // Get attendance statistics
  static async getAttendanceStats(req, res) {
    try {
      const { id } = req.params;
      const stats = await AttendanceService.getAttendanceStats(id);

      res.json({
        status: "success",
        message: "Attendance statistics retrieved successfully",
        data: stats,
      });
    } catch (error) {
      const statusCode = error.message.includes("Student not found") || 
                        error.message.includes("Invalid student ID") ? 404 : 500;
      
      res.status(statusCode).json({
        status: "error",
        message: `Failed to retrieve attendance statistics for student with ID: ${req.params.id}`,
        error: error.message,
      });
    }
  }
}

export default AttendanceController;