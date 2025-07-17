import express from "express";
import Badge from "../models/Badge.js";
import { uploadBadge } from "../middleware/upload.js";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// Get all badges
router.get("/", async (req, res) => {
  try {
    // Pagination parameters (like students.js)
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 15;
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    const skip = (page - 1) * limit;

    const [badges, total] = await Promise.all([
      Badge.find().skip(skip).limit(limit),
      Badge.countDocuments(),
    ]);

    res.status(200).json({
      status: "success",
      message: "Badges retrieved successfully",
      data: badges,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + badges.length < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve badges.",
      error: error.message,
    });
  }
});

// Get single badge
router.get("/:id", async (req, res) => {
  try {
    const badge = await Badge.findById(req.params.id);
    if (!badge) {
      return res.status(404).json({
        success: false,
        message: `Badge with id ${req.params.id} not found`
      });
    }
    res.status(200).json({
      success: true,
      data: badge,
      message: "Badge retrieved successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to retrieve badge with id ${req.params.id}`,
      error: error.message
    });
  }
});

// Create badge
router.post("/", uploadBadge.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Badge image is required"
      });
    }

    const badge = new Badge({
      title: req.body.title,
      description: req.body.description,
      image: `${process.env.BASE_URL}/uploads/badges/${req.file.filename}`,
    });

    await badge.save();
    res.status(201).json({
      success: true,
      data: badge,
      message: "Badge created successfully"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to create badge",
      error: error.message
    });
  }
});

// Update badge
router.put("/:id", uploadBadge.single("image"), async (req, res) => {
  try {
    const badge = await Badge.findById(req.params.id);
    if (!badge) {
      return res.status(404).json({
        success: false,
        message: `Badge with id ${req.params.id} not found`
      });
    }

    badge.title = req.body.title || badge.title;
    badge.description = req.body.description || badge.description;

    if (req.file) {
      // Delete old image
      if (badge.image) {
        const oldImagePath = path.join(process.cwd(), "public", badge.image);
        await fs.unlink(oldImagePath).catch(() => {});
      }
      badge.image = `${process.env.BASE_URL}/uploads/badges/${req.file.filename}`;
    }

    await badge.save();
    res.status(200).json({
      success: true,
      data: badge,
      message: "Badge updated successfully"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to update badge with id ${req.params.id}`,
      error: error.message
    });
  }
});

// Delete badge
router.delete("/:id", async (req, res) => {
  try {
    const badge = await Badge.findById(req.params.id);
    if (!badge) {
      return res.status(404).json({
        success: false,
        message: `Badge with id ${req.params.id} not found`
      });
    }

    // Delete image
    if (badge.image) {
      const imagePath = path.join(process.cwd(), "public", badge.image);
      await fs.unlink(imagePath).catch(() => {});
    }

    await badge.deleteOne();
    res.status(200).json({
      success: true,
      message: "Badge deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to delete badge with id ${req.params.id}`,
      error: error.message
    });
  }
});

export default router;
