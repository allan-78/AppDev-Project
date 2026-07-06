import { asyncHandler } from "../utils/asyncHandler.js";
import { MaintenanceCase } from "../models/MaintenanceCase.js";
import { createMaintenanceAllocation } from "../services/maintenanceService.js";
import { notifyUser } from "../services/notificationService.js";

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
    estimatedPointCost: req.body.estimatedPointCost,
    allocationMethod: req.body.allocationMethod || "usage-weighted",
    lookbackCount: req.body.lookbackCount || 5,
    evidenceImages: req.body.evidenceImages || []
  });
  res.status(201).json({ maintenanceCase });
});

export const listMyCharges = asyncHandler(async (req, res) => {
  // Find all maintenance cases where the current user has an allocation
  const cases = await MaintenanceCase.find({
    "allocations.user": req.user._id,
    community: req.user.community
  })
    .populate("tool", "name healthScore")
    .populate("allocations.user", "fullName email")
    .sort({ createdAt: -1 });

  // Extract only the allocations for the current user
  const charges = cases
    .map(mc => ({
      maintenanceCase: mc._id,
      tool: mc.tool,
      issue: mc.issue,
      estimatedPointCost: mc.estimatedPointCost,
      allocation: mc.allocations.find(a => a.user._id.toString() === req.user._id.toString()),
      createdAt: mc.createdAt
    }))
    .filter(c => c.allocation);

  res.json({ charges });
});

export const acceptCharge = asyncHandler(async (req, res) => {
  const maintenanceCase = await MaintenanceCase.findById(req.params.id);
  if (!maintenanceCase) return res.status(404).json({ message: "Maintenance case not found" });

  const allocation = maintenanceCase.allocations.find(a => a.user.toString() === req.user._id.toString());
  if (!allocation) return res.status(403).json({ message: "You are not assigned to this maintenance case" });

  allocation.status = "accepted";
  allocation.respondedAt = new Date();
  await maintenanceCase.save();

  await notifyUser(maintenanceCase.openedBy, {
    title: "Maintenance charge accepted",
    message: `A user accepted their ${allocation.pointShare} point maintenance charge for the tool.`,
    type: "maintenance",
    data: { maintenanceCaseId: maintenanceCase._id }
  });

  res.json({ maintenanceCase });
});

export const disputeCharge = asyncHandler(async (req, res) => {
  const maintenanceCase = await MaintenanceCase.findById(req.params.id);
  if (!maintenanceCase) return res.status(404).json({ message: "Maintenance case not found" });

  const allocation = maintenanceCase.allocations.find(a => a.user.toString() === req.user._id.toString());
  if (!allocation) return res.status(403).json({ message: "You are not assigned to this maintenance case" });

  allocation.status = "disputed";
  allocation.respondedAt = new Date();
  allocation.disputedReason = req.body.reason || "User disputed this charge";
  await maintenanceCase.save();

  await notifyUser(maintenanceCase.openedBy, {
    title: "Maintenance charge disputed",
    message: `A user disputed their ${allocation.pointShare} point maintenance charge. Reason: ${allocation.disputedReason}`,
    type: "maintenance",
    data: { maintenanceCaseId: maintenanceCase._id }
  });

  res.json({ maintenanceCase });
});

export const getToolMaintenanceHistory = asyncHandler(async (req, res) => {
  const cases = await MaintenanceCase.find({ tool: req.params.toolId })
    .populate("openedBy", "fullName email")
    .populate("allocations.user", "fullName email")
    .sort({ createdAt: -1 });

  res.json({ cases });
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
