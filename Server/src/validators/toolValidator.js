import mongoose from "mongoose";

export const validateCreateTool = (req, res, next) => {
  const { name, description, category, images, depositPoints } = req.body;
  const errors = [];

  if (!name || typeof name !== "string" || !name.trim()) {
    errors.push({ msg: "Tool name is required", path: "name" });
  }
  if (!description || typeof description !== "string" || !description.trim()) {
    errors.push({ msg: "Description is required", path: "description" });
  }
  if (!category || !mongoose.Types.ObjectId.isValid(category)) {
    errors.push({ msg: "A valid category ID is required", path: "category" });
  }
  if (!images || !Array.isArray(images) || images.length === 0) {
    errors.push({ msg: "At least one image is required", path: "images" });
  }
  if (depositPoints !== undefined && (isNaN(depositPoints) || Number(depositPoints) < 5)) {
    errors.push({ msg: "Deposit points must be at least 5", path: "depositPoints" });
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  next();
};

export const validateUpdateTool = (req, res, next) => {
  const { name, description, category, images, depositPoints } = req.body;
  const errors = [];

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    errors.push({ msg: "Tool name cannot be empty", path: "name" });
  }
  if (description !== undefined && (typeof description !== "string" || !description.trim())) {
    errors.push({ msg: "Description cannot be empty", path: "description" });
  }
  if (category !== undefined && !mongoose.Types.ObjectId.isValid(category)) {
    errors.push({ msg: "Category must be a valid ID", path: "category" });
  }
  if (images !== undefined && (!Array.isArray(images) || images.length === 0)) {
    errors.push({ msg: "Images must be a non-empty array", path: "images" });
  }
  if (depositPoints !== undefined && (isNaN(depositPoints) || Number(depositPoints) < 5)) {
    errors.push({ msg: "Deposit points must be at least 5", path: "depositPoints" });
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  next();
};
