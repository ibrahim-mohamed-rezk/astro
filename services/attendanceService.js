// services/attendanceService.js
import Student from "../models/Student.js";
import mongoose from "mongoose";

class AttendanceService {
  // Validate ObjectId format
  static validateObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id) && id.match(/^[0-9a-fA-F]{24}$/);
  }

  // Find student by ID
  static async findStudentById(studentId) {
    if (!this.validateObjectId(studentId)) {
      throw new Error(`Invalid student ID format: ${studentId}`);
    }
    
    const student = await Student.findById(studentId);
    if (!student) {
      throw new Error(`Student not found with ID: ${studentId}`);
    }
    
    return student;
  }

  // Validate attendance data
  static validateAttendanceData(data) {
    const { day, week, month, status } = data;
    const errors = [];

    if (day === undefined) errors.push("day");
    if (week === undefined) errors.push("week");
    if (month === undefined) errors.push("month");
    if (status === undefined) errors.push("status");

    if (errors.length > 0) {
      throw new Error(`Missing required field(s): ${errors.join(", ")}`);
    }

    if (day < 1 || day > 31) {
      throw new Error("Day must be between 1 and 31");
    }
    if (week < 1 || week > 53) {
      throw new Error("Week must be between 1 and 53");
    }
    if (month < 1 || month > 12) {
      throw new Error("Month must be between 1 and 12");
    }

    return { day, week, month, status: Boolean(status) };
  }

  // Check for duplicate attendance record
  static checkDuplicateAttendance(student, day, week, month, excludeIndex = -1) {
    return student.attendance.find((a, index) => 
      index !== excludeIndex && 
      a.day === day && 
      a.week === week && 
      a.month === month
    );
  }

  // Get all attendance records for a student with optional filters
  static async getAllAttendance(studentId, filters = {}) {
    const student = await this.findStudentById(studentId);
    
    let attendance = [...student.attendance];
    
    // Apply filters
    if (filters.month) {
      attendance = attendance.filter(a => a.month === parseInt(filters.month));
    }
    if (filters.week) {
      attendance = attendance.filter(a => a.week === parseInt(filters.week));
    }
    if (filters.status !== undefined) {
      attendance = attendance.filter(a => a.status === (filters.status === 'true'));
    }

    // Sort by most recent first
    attendance.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return attendance;
  }

  // Get specific attendance record
  static async getAttendanceById(studentId, attendanceId) {
    const student = await this.findStudentById(studentId);
    
    const attendance = student.attendance.id(attendanceId);
    if (!attendance) {
      throw new Error(`Attendance record not found with ID: ${attendanceId} for student with ID: ${studentId}`);
    }

    return attendance;
  }

  // Create new attendance record
  static async createAttendance(studentId, attendanceData) {
    const student = await this.findStudentById(studentId);
    const validatedData = this.validateAttendanceData(attendanceData);
    
    // Check for duplicate
    const existing = this.checkDuplicateAttendance(
      student, 
      validatedData.day, 
      validatedData.week, 
      validatedData.month
    );
    
    if (existing) {
      throw new Error(`Attendance record already exists for day ${validatedData.day}, week ${validatedData.week}, month ${validatedData.month}`);
    }

    student.attendance.push(validatedData);
    await student.save();
    
    return student;
  }

  // Update attendance record
  static async updateAttendance(studentId, attendanceId, updateData) {
    const student = await this.findStudentById(studentId);
    
    const attendanceIndex = student.attendance.findIndex(
      (attendance) => attendance._id.toString() === attendanceId
    );

    if (attendanceIndex === -1) {
      throw new Error(`Attendance record not found with ID: ${attendanceId} for student with ID: ${studentId}`);
    }

    // Validate update data if provided
    const { day, week, month, status } = updateData;
    
    if (day !== undefined && (day < 1 || day > 31)) {
      throw new Error("Day must be between 1 and 31");
    }
    if (week !== undefined && (week < 1 || week > 53)) {
      throw new Error("Week must be between 1 and 53");
    }
    if (month !== undefined && (month < 1 || month > 12)) {
      throw new Error("Month must be between 1 and 12");
    }

    // Check for duplicate if date fields are being updated
    if (day !== undefined || week !== undefined || month !== undefined) {
      const updatedDay = day !== undefined ? day : student.attendance[attendanceIndex].day;
      const updatedWeek = week !== undefined ? week : student.attendance[attendanceIndex].week;
      const updatedMonth = month !== undefined ? month : student.attendance[attendanceIndex].month;

      const existing = this.checkDuplicateAttendance(
        student, 
        updatedDay, 
        updatedWeek, 
        updatedMonth, 
        attendanceIndex
      );

      if (existing) {
        throw new Error(`Attendance record already exists for day ${updatedDay}, week ${updatedWeek}, month ${updatedMonth}`);
      }
    }

    // Update the attendance record
    student.attendance[attendanceIndex] = {
      ...student.attendance[attendanceIndex].toObject(),
      ...updateData,
      status: status !== undefined ? Boolean(status) : student.attendance[attendanceIndex].status
    };

    await student.save();
    return student;
  }

  // Delete attendance record
  static async deleteAttendance(studentId, attendanceId) {
    const student = await this.findStudentById(studentId);
    
    const attendanceIndex = student.attendance.findIndex(
      (attendance) => attendance._id.toString() === attendanceId
    );

    if (attendanceIndex === -1) {
      throw new Error(`Attendance record not found with ID: ${attendanceId} for student with ID: ${studentId}`);
    }

    student.attendance.splice(attendanceIndex, 1);
    await student.save();
    
    return student;
  }

  // Get attendance statistics
  static async getAttendanceStats(studentId) {
    const student = await this.findStudentById(studentId);
    
    const attendance = student.attendance;
    const totalRecords = attendance.length;
    const presentRecords = attendance.filter(a => a.status === true).length;
    const absentRecords = totalRecords - presentRecords;
    const attendancePercentage = totalRecords > 0 ? ((presentRecords / totalRecords) * 100).toFixed(2) : 0;

    // Monthly breakdown
    const monthlyStats = {};
    attendance.forEach(record => {
      if (!monthlyStats[record.month]) {
        monthlyStats[record.month] = { total: 0, present: 0, absent: 0 };
      }
      monthlyStats[record.month].total++;
      if (record.status) {
        monthlyStats[record.month].present++;
      } else {
        monthlyStats[record.month].absent++;
      }
    });

    // Calculate monthly percentages
    Object.keys(monthlyStats).forEach(month => {
      const stats = monthlyStats[month];
      stats.percentage = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(2) : 0;
    });

    return {
      overall: {
        totalRecords,
        presentRecords,
        absentRecords,
        attendancePercentage: parseFloat(attendancePercentage)
      },
      monthlyBreakdown: monthlyStats
    };
  }
}

export default AttendanceService;