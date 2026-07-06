import mongoose from "mongoose";

export const validateMongoId = (req, res, next) => {
  const { id } = req.params;
  if (id && !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      errors: [{ msg: "Invalid ID format", path: "id", value: id }]
    });
  }
  next();
};
