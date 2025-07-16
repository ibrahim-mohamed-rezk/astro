import express from "express";
import Badge from "../models/Badge.js";
import { uploadBadge } from "../middleware/upload.js";
import fs from "fs/promises";
import path from "path";


const router = express.Router();

// Get all badges
router.get("/", async (req, res) => {
  try {
    const badges = await Badge.find();
    res.json(badges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single badge
router.get("/:id", async (req, res) => {
  try {
    const badge = await Badge.findById(req.params.id);
    if (!badge) {
      return res.status(404).json({ message: "Badge not found" });
    }
    res.json(badge);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create badge
router.post("/", uploadBadge.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Badge image is required" });
    }

    const badge = new Badge({
      title: req.body.title,
      description: req.body.description,
      image: `/uploads/badges/${req.file.filename}`,
    });

    await badge.save();
    res.status(201).json(badge);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update badge
router.put("/:id", uploadBadge.single("image"), async (req, res) => {
  try {
    const badge = await Badge.findById(req.params.id);
    if (!badge) {
      return res.status(404).json({ message: "Badge not found" });
    }

    badge.title = req.body.title || badge.title;
    badge.description = req.body.description || badge.description;

    if (req.file) {
      // Delete old image
      if (badge.image) {
        const oldImagePath = path.join(__dirname, "..", "public", badge.image);
        await fs.unlink(oldImagePath).catch(() => {});
      }
      badge.image = `/uploads/badges/${req.file.filename}`;
    }

    await badge.save();
    res.json(badge);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete badge
router.delete("/:id", async (req, res) => {
  try {
    const badge = await Badge.findById(req.params.id);
    if (!badge) {
      return res.status(404).json({ message: "Badge not found" });
    }

    // Delete image
    if (badge.image) {
      const imagePath = path.join(__dirname, "..", "public", badge.image);
      await fs.unlink(imagePath).catch(() => {});
    }

    await badge.deleteOne();
    res.json({ message: "Badge deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
