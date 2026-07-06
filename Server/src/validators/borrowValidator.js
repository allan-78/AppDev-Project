import mongoose from "mongoose";

export const validateCreateBorrow = (req, res, next) => {
  const { tool, startDate, endDate, requestNote } = req.body;
  const errors = [];

  if (!tool || !mongoose.Types.ObjectId.isValid(tool)) {
    errors.push({ msg: "A valid tool ID is required", path: "tool" });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (!startDate || isNaN(start.getTime())) {
    errors.push({ msg: "A valid start date is required", path: "startDate" });
  }
  if (!endDate || isNaN(end.getTime())) {
    errors.push({ msg: "A valid end date is required", path: "endDate" });
  }
  if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start > end) {
    errors.push({ msg: "End date cannot be before start date", path: "endDate" });
  }
  if (requestNote !== undefined && typeof requestNote !== "string") {
    errors.push({ msg: "Request note must be a string", path: "requestNote" });
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  next();
};
