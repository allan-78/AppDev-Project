import { BorrowRequest } from "../models/BorrowRequest.js";
import { MaintenanceCase } from "../models/MaintenanceCase.js";
import { Tool } from "../models/Tool.js";
import { adjustTrustPoints } from "./trustService.js";
import { notifyUser } from "./notificationService.js";

function daysBetween(start, end) {
  const ms = Math.max(1, new Date(end) - new Date(start));
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export async function createMaintenanceAllocation({ 
  toolId, 
  openedBy, 
  issue, 
  estimatedPointCost = 50,
  allocationMethod = "usage-weighted",
  lookbackCount = 5,
  evidenceImages = []
}) {
  const tool = await Tool.findById(toolId);
  if (!tool) {
    const error = new Error("Tool not found");
    error.statusCode = 404;
    throw error;
  }

  const recent = await BorrowRequest.find({ tool: tool._id, status: "completed" })
    .sort({ returnedAt: -1, updatedAt: -1 })
    .limit(lookbackCount)
    .populate("borrower", "fullName trustPoints email");

  let allocations = [];

  if (allocationMethod === "equal") {
    // Equal split among all borrowers
    const pointShare = Math.ceil(estimatedPointCost / (recent.length || 1));
    allocations = recent.map((request) => ({
      user: request.borrower._id,
      borrowRequest: request._id,
      weight: 1,
      pointShare,
      reason: "Equal allocation"
    }));
  } else if (allocationMethod === "duration-weighted") {
    // Split based on borrow duration only
    const weighted = recent.map((request) => {
      const duration = daysBetween(request.startDate, request.endDate);
      return {
        request,
        weight: duration,
        reason: `Borrow duration: ${duration} day(s)`
      };
    });

    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0) || 1;
    allocations = weighted.map((item) => ({
      user: item.request.borrower._id,
      borrowRequest: item.request._id,
      weight: item.weight,
      pointShare: Math.ceil((item.weight / totalWeight) * estimatedPointCost),
      reason: item.reason
    }));
  } else {
    // usage-weighted (default): duration + late return weight
    const weighted = recent.map((request) => {
      const duration = daysBetween(request.startDate, request.endDate);
      const lateWeight = request.returnedAt && request.returnedAt > request.endDate ? 2 : 0;
      return {
        request,
        weight: duration + lateWeight,
        reason: lateWeight ? "Borrow duration plus late-return risk" : "Borrow duration share"
      };
    });

    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0) || 1;
    allocations = weighted.map((item) => ({
      user: item.request.borrower._id,
      borrowRequest: item.request._id,
      weight: item.weight,
      pointShare: Math.ceil((item.weight / totalWeight) * estimatedPointCost),
      reason: item.reason
    }));
  }

  const maintenanceCase = await MaintenanceCase.create({
    tool: tool._id,
    community: tool.community,
    openedBy,
    issue,
    estimatedPointCost,
    allocationMethod,
    evidenceImages,
    allocations,
    status: allocations.length ? "allocated" : "open"
  });

  for (const allocation of allocations) {
    await adjustTrustPoints({
      userId: allocation.user,
      community: tool.community,
      amount: -allocation.pointShare,
      type: "maintenance_share",
      reason: `Maintenance share for ${tool.name}`,
      relatedTool: tool._id
    });

    // Notify affected borrowers
    const borrower = recent.find(r => r.borrower._id.toString() === allocation.user.toString())?.borrower;
    if (borrower) {
      await notifyUser(allocation.user, {
        title: "Maintenance cost allocated",
        message: `You have been assigned ${allocation.pointShare} trust points for maintenance on ${tool.name}. ${allocation.reason}`,
        type: "maintenance",
        data: { maintenanceCaseId: maintenanceCase._id }
      });
    }
  }

  tool.status = "maintenance";
  tool.condition = "needs_service";
  tool.healthScore = Math.max(0, tool.healthScore - 15);
  tool.wearLogs.push({ note: issue, condition: "needs_service", loggedBy: openedBy });
  await tool.save();

  return maintenanceCase.populate("allocations.user", "fullName email trustPoints");
}
