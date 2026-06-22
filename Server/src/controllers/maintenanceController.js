import { asyncHandler } from "../utils/asyncHandler.js";
import { MaintenanceCase } from "../models/MaintenanceCase.js";
import { createMaintenanceAllocation } from "../services/maintenanceService.js";

export const listMaintenance = asyncHandler(async (req, res) => {
  const cases = await MaintenanceCase.find({ community: req.user.community })
    .populate("tool", "name condition healthScore")
    .populate("allocations.user", "fullName email trustPoints")
    .sort({ createdAt: -1 });
  res.json({ cases });
});

export const createMaintenance = asyncHandler(async (req, res) => {
  const maintenanceCase = await createMaintenanceAllocation({
    toolId: req.body.tool,
    openedBy: req.user._id,
    issue: req.body.issue,
    estimatedPointCost: req.body.estimatedPointCost
  });
  res.status(201).json({ maintenanceCase });
});

export const resolveMaintenance = asyncHandler(async (req, res) => {
  const maintenanceCase = await MaintenanceCase.findByIdAndUpdate(
    req.params.id,
    { status: "resolved", resolvedAt: new Date() },
    { new: true }
  );
  if (!maintenanceCase) return res.status(404).json({ message: "Maintenance case not found" });
  res.json({ maintenanceCase });
});
