import express from "express";
const router = express.Router();
import Student from "../models/Student.js";
import { uploadStudent } from "../middleware/upload.js";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

// Get all students with pagination
router.get("/", async (req, res) => {
  try {
    // Pagination parameters
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 20;
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      Student.find().populate("badges").skip(skip).limit(limit),
      Student.countDocuments(),
    ]);

    res.json({
      status: "success",
      message: "Students retrieved successfully",
      data: students,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + students.length < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve students.",
      error: error.message,
    });
  }
});

// Get filtered students with pagination
router.get("/filters", async (req, res) => {
  try {
    // Build a filter that matches if ANY of the fields match (OR logic)
    const orFilters = [];
    if (req.query.name) {
      orFilters.push({ name: { $regex: req.query.name, $options: "i" } });
    }
    if (req.query.email) {
      orFilters.push({ email: { $regex: req.query.email, $options: "i" } });
    }
    if (req.query.studentCode) {
      orFilters.push({
        studentCode: { $regex: req.query.studentCode, $options: "i" },
      });
    }
    if (req.query.phone) {
      orFilters.push({ phone: { $regex: req.query.phone, $options: "i" } });
    }
    const filter = orFilters.length > 0 ? { $or: orFilters } : {};

    // Pagination parameters
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 20;
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      Student.find(filter).populate("badges").skip(skip).limit(limit),
      Student.countDocuments(filter),
    ]);

    res.json({
      status: "success",
      message: "Students retrieved successfully",
      data: students,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + students.length < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to filter students.",
      error: error.message,
    });
  }
});

// Get single student
router.get("/:id", async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: "error",
        message: `Invalid student ID format: ${req.params.id}`,
        data: null,
      });
    }

    const student = await Student.findById(req.params.id).populate("badges");
    if (!student) {
      return res.status(404).json({
        status: "error",
        message: `Student not found with ID: ${req.params.id}`,
        data: null,
      });
    }
    res.json({
      status: "success",
      message: "Student retrieved successfully",
      data: student,
    });
  } catch (error) {
    console.error("Error retrieving student:", error);
    res.status(500).json({
      status: "error",
      message: `An error occurred while retrieving the student with ID: ${req.params.id}`,
      error: error.message,
      data: null,
    });
  }
});

// Create student
router.post("/", uploadStudent.single("photo"), async (req, res) => {
  try {
    const studentData = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      studentCode: "#" + Math.random().toString(36).substr(2, 6),
    };

    if (!studentData.name) {
      return res.status(400).json({
        status: "error",
        message: "Name is required",
        data: null,
      });
    }
    if (
      !studentData.email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentData.email)
    ) {
      return res.status(400).json({
        status: "error",
        message: "A valid email is required",
        data: null,
      });
    }
    if (!studentData.phone) {
      return res.status(400).json({
        status: "error",
        message: "Phone number is required",
        data: null,
      });
    }

    // Check if email or phone is already used
    const existingStudent = await Student.findOne({
      $or: [{ email: studentData.email }, { phone: studentData.phone }],
    });

    if (existingStudent) {
      let usedFields = [];
      if (existingStudent.email === studentData.email) usedFields.push("email");
      if (existingStudent.phone === studentData.phone) usedFields.push("phone");
      return res.status(400).json({
        status: "error",
        message: ` ${usedFields
          .map((field) => `${field} is already used`)
          .join(", ")}`,
        data: null,
      });
    }

    if (req.file) {
      studentData.photo = `${process.env.BASE_URL}/uploads/students/${req.file.filename}`;
    }

    const student = new Student(studentData);
    await student.save();
    res.status(201).json({
      status: "success",
      message: "Student created successfully",
      data: student,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: "Failed to create student. Please check the input data.",
      error: error.message,
    });
  }
});

// Update student
router.put("/:id", uploadStudent.single("photo"), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        status: "error",
        message: `Student not found with ID: ${req.params.id}`,
        data: null,
      });
    }

    // Validate input fields
    const updatedName =
      req.body.name !== undefined ? req.body.name : student.name;
    const updatedEmail =
      req.body.email !== undefined ? req.body.email : student.email;
    const updatedPhone =
      req.body.phone !== undefined ? req.body.phone : student.phone;

    if (!updatedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updatedEmail)) {
      return res.status(400).json({
        status: "error",
        message: "A valid email is required",
        data: null,
      });
    }

    // Build query to check for existing email/phone
    const orConditions = [];

    // Only check email if it's being updated and is different from current
    if (req.body.email !== undefined && req.body.email !== student.email) {
      orConditions.push({ email: req.body.email });
    }

    // Only check phone if it's being updated and is different from current
    if (req.body.phone !== undefined && req.body.phone !== student.phone) {
      orConditions.push({ phone: req.body.phone });
    }

    // Check if email or phone is already used by another student
    if (orConditions.length > 0) {
      const existingStudent = await Student.findOne({
        $or: orConditions,
        _id: { $ne: req.params.id },
      });

      if (existingStudent) {
        let usedFields = [];

        // Check which fields are already in use
        if (
          req.body.email !== undefined &&
          existingStudent.email === req.body.email
        ) {
          usedFields.push("email");
        }

        if (
          req.body.phone !== undefined &&
          existingStudent.phone === req.body.phone
        ) {
          usedFields.push("phone");
        }

        return res.status(400).json({
          status: "error",
          message: `${usedFields
            .map((field) => `${field} is already used`)
            .join(", ")}`,
          data: null,
        });
      }
    }

    // Update fields
    student.name = updatedName;
    student.email = updatedEmail;
    student.phone = updatedPhone;

    if (req.file) {
      // Delete old photo if exists
      if (student.photo) {
        // Use import.meta.url to get the directory name in ES modules
        let __dirname;
        try {
          __dirname = path.dirname(new URL(import.meta.url).pathname);
        } catch (e) {
          // If __dirname cannot be determined, return error
          return res.status(400).json({
            status: "error",
            message: `Failed to update student with ID: ${req.params.id}. Please check the input data.`,
            error: "__dirname is not defined",
            data: null,
          });
        }
        const oldPhotoPath = path.join(
          __dirname,
          "..",
          "public",
          student.photo
        );
        await fs.unlink(oldPhotoPath).catch(() => {});
      }
      student.photo = `${process.env.BASE_URL}/uploads/students/${req.file.filename}`;
    }

    await student.save();
    res.json({
      status: "success",
      message: "Student updated successfully",
      data: student,
    });
  } catch (error) {
    // If error is ReferenceError and about __dirname, return the required error message
    if (
      error instanceof ReferenceError &&
      error.message &&
      error.message.includes("__dirname")
    ) {
      return res.status(400).json({
        status: "error",
        message: `Failed to update student with ID: ${req.params.id}. Please check the input data.`,
        error: "__dirname is not defined",
        data: null,
      });
    }
    res.status(400).json({
      status: "error",
      message: `Failed to update student with ID: ${req.params.id}. Please check the input data.`,
      error: error.message,
      data: null,
    });
  }
});

// Delete student
router.delete("/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        status: "error",
        message: `Student not found `,
      });
    }

    // Delete photo if exists
    if (student.photo) {
      // Use import.meta.url to get the directory name in ES modules
      const __dirname = path.dirname(new URL(import.meta.url).pathname);
      const photoPath = path.join(__dirname, "..", "public", student.photo);
      await fs.unlink(photoPath).catch(() => {});
    }

    await student.deleteOne();
    res.json({
      status: "success",
      message: `Student deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: `Failed to delete student`,
      error: error.message,
    });
  }
});

// Add rating
router.post("/:id/ratings", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        status: "error",
        message: `Student not found with ID: ${req.params.id}`,
      });
    }

    // Validate required fields
    const { week, day, assignments, participation, performance } = req.body;
    const missingFields = [];
    if (week === undefined) missingFields.push("week");
    if (day === undefined) missingFields.push("day");
    if (assignments === undefined) missingFields.push("assignments");
    if (participation === undefined) missingFields.push("participation");
    if (performance === undefined) missingFields.push("performance");

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: "error",
        message: `Failed to add rating to student with ID: ${req.params.id}. Please check the input data.`,
        error: `Missing required field(s): ${missingFields.join(", ")}`,
      });
    }

    student.ratings.push({
      week,
      day,
      assignments,
      participation,
      performance,
    });

    await student.save();
    res.json({
      status: "success",
      message: "Rating added successfully",
      data: student,
    });
  } catch (error) {
    // Format Mongoose validation errors for ratings
    let formattedError = error.message;
    if (error.name === "ValidationError" && error.errors) {
      const ratingErrors = Object.entries(error.errors)
        .filter(([key]) => key.startsWith("ratings"))
        .map(([key, err]) => `${key}: ${err.message}`)
        .join(", ");
      if (ratingErrors) {
        formattedError = `Student validation failed: ${ratingErrors}`;
      }
    }
    res.status(400).json({
      status: "error",
      message: `Failed to add rating to student with ID: ${req.params.id}. Please check the input data.`,
      error: formattedError,
    });
  }
});

// Update rating
router.put("/:id/ratings/:ratingId", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        status: "error",
        message: `Student not found with ID: ${req.params.id}`,
      });
    }

    const ratingIndex = student.ratings.findIndex(
      (rating) => rating._id.toString() === req.params.ratingId
    );

    if (ratingIndex === -1) {
      return res.status(404).json({
        status: "error",
        message: `Rating not found with ID: ${req.params.ratingId} for student with ID: ${req.params.id}`,
      });
    }

    student.ratings[ratingIndex] = {
      ...student.ratings[ratingIndex],
      ...req.body,
    };

    await student.save();
    res.json({
      status: "success",
      message: `Rating with ID: ${req.params.ratingId} updated successfully for student with ID: ${req.params.id}`,
      data: student,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: `Failed to update rating with ID: ${req.params.ratingId} for student with ID: ${req.params.id}. Please check the input data.`,
      error: error.message,
    });
  }
});

// Delete rating
router.delete("/:id/ratings/:ratingId", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        status: "error",
        message: `Student not found with ID: ${req.params.id}`,
      });
    }

    const ratingIndex = student.ratings.findIndex(
      (rating) => rating._id.toString() === req.params.ratingId
    );

    if (ratingIndex === -1) {
      return res.status(404).json({
        status: "error",
        message: `Rating not found with ID: ${req.params.ratingId} for student with ID: ${req.params.id}`,
      });
    }

    student.ratings.splice(ratingIndex, 1);
    await student.save();

    res.json({
      status: "success",
      message: `Rating with ID: ${req.params.ratingId} deleted successfully from student with ID: ${req.params.id}`,
      data: student,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: `Failed to delete rating with ID: ${req.params.ratingId} from student with ID: ${req.params.id}.`,
      error: error.message,
    });
  }
});

// Add badge to student
router.post("/:id/badges", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        status: "error",
        message: `Student not found with ID: ${req.params.id}`,
      });
    }

    if (!student.badges.includes(req.body.badgeId)) {
      student.badges.push(req.body.badgeId);
      await student.save();
    }

    const updatedStudent = await Student.findById(req.params.id).populate(
      "badges"
    );
    res.json({
      status: "success",
      message: `Badge added to student with ID: ${req.params.id} successfully`,
      data: updatedStudent,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: `Failed to add badge to student with ID: ${req.params.id}. Please check the input data.`,
      error: error.message,
    });
  }
});

// Remove badge from student
router.delete("/:id/badges/:badgeId", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        status: "error",
        message: `Student not found with ID: ${req.params.id}`,
      });
    }

    student.badges = student.badges.filter(
      (b) => b.toString() !== req.params.badgeId
    );
    await student.save();

    const updatedStudent = await Student.findById(req.params.id).populate(
      "badges"
    );
    res.json({
      status: "success",
      message: `Badge with ID: ${req.params.badgeId} removed from student with ID: ${req.params.id} successfully`,
      data: updatedStudent,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: `Failed to remove badge with ID: ${req.params.badgeId} from student with ID: ${req.params.id}.`,
      error: error.message,
    });
  }
});

export default router;
