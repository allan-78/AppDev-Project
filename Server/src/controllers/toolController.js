import { asyncHandler } from "../utils/asyncHandler.js";
import { Tool } from "../models/Tool.js";
import { Category } from "../models/Category.js";
import { audit } from "../services/auditService.js";

// Utility to escape special regex characters to prevent NoSQL injection
function escapeRegex(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const listTools = asyncHandler(async (req, res) => {
  const query = { community: req.user.community };
  
  if (req.query.owner === "me") {
    // Owner viewing their own tools - show all statuses
    query.owner = req.user._id;
  } else {
    // Default: only show available tools (not borrowed/reserved/disabled)
    if (req.query.status) {
      query.status = req.query.status;
    } else {
      query.status = { $nin: ["disabled", "reserved", "borrowed"] };
    }
  }
  
  if (req.query.condition) query.condition = req.query.condition;
  if (req.query.category) query.category = req.query.category;
  if (req.query.search) {
    const safeSearch = escapeRegex(req.query.search);
    query.$or = [
      { name: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } }
    ];
  }
  if (req.query.minTrust) query.depositPoints = { $lte: Number(req.user.trustPoints || 0) };

  const tools = await Tool.find(query)
    .populate("owner", "fullName email avatarUrl bio address phone followers following trustPoints idVerified")
    .populate("category", "name icon")
    .sort({ healthScore: -1, createdAt: -1 });
  res.json({ tools });
});

export const getTool = asyncHandler(async (req, res) => {
  const tool = await Tool.findById(req.params.id).populate("owner", "fullName email phone address avatarUrl bio followers following trustPoints idVerified").populate("category", "name icon");
  if (!tool) return res.status(404).json({ message: "Tool not found" });
  res.json({ tool });
});

// Whitelist of fields allowed for tool creation and updates
const TOOL_ALLOWED_FIELDS = ['name', 'description', 'category', 'condition', 'rules', 'pickupLocation', 'availableWindows', 'securityNotes', 'requiresIdCheck', 'requiresPhotoEvidence', 'maxBorrowDays', 'depositPoints', 'images'];

export const createTool = asyncHandler(async (req, res) => {
  if (Number(req.body.depositPoints || 0) < 5) {
    return res.status(400).json({ message: "Escrow must be at least 5 trust points for safer lending." });
  }
  if (!req.body.category) return res.status(400).json({ message: "Choose a category before listing a tool." });
  if (!req.body.images?.length) return res.status(400).json({ message: "Add at least one listing image URL." });

  // FIX: Whitelist fields instead of spreading req.body to prevent mass assignment
  const toolData = { owner: req.user._id, community: req.user.community };
  TOOL_ALLOWED_FIELDS.forEach(field => { if (req.body[field] !== undefined) toolData[field] = req.body[field]; });

  const tool = await Tool.create(toolData);
  await audit(req.user, "tool.create", "Tool", tool._id, { name: tool.name });
  res.status(201).json({ tool });
});

export const updateTool = asyncHandler(async (req, res) => {
  const tool = await Tool.findById(req.params.id);
  if (!tool) return res.status(404).json({ message: "Tool not found" });
  const isOwner = tool.owner.toString() === req.user._id.toString();
  const isAdmin = ["admin", "superAdmin"].includes(req.user.role);
  if (!isOwner && !isAdmin) return res.status(403).json({ message: "Only owner or admin can update this tool" });

  // FIX: Whitelist allowed fields instead of Object.assign(tool, req.body)
  TOOL_ALLOWED_FIELDS.forEach(field => { if (req.body[field] !== undefined) tool[field] = req.body[field]; });
  await tool.save();
  await audit(req.user, "tool.update", "Tool", tool._id, { name: tool.name });
  res.json({ tool });
});

export const deleteTool = asyncHandler(async (req, res) => {
  const tool = await Tool.findByIdAndUpdate(req.params.id, { status: "disabled" }, { new: true });
  if (!tool) return res.status(404).json({ message: "Tool not found" });
  await audit(req.user, "tool.disable", "Tool", tool._id, { name: tool.name });
  res.json({ tool });
});

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ $or: [{ community: req.user.community }, { isDefault: true }] }).sort("name");
  res.json({ categories });
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create({ ...req.body, community: req.user.community });
  res.status(201).json({ category });
});
