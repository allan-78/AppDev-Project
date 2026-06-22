import { asyncHandler } from "../utils/asyncHandler.js";
import { Tool } from "../models/Tool.js";
import { Category } from "../models/Category.js";
import { audit } from "../services/auditService.js";

export const listTools = asyncHandler(async (req, res) => {
  const query = { community: req.user.community };
  if (req.query.status) query.status = req.query.status;
  if (req.query.condition) query.condition = req.query.condition;
  if (req.query.category) query.category = req.query.category;
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { description: { $regex: req.query.search, $options: "i" } }
    ];
  }
  if (req.query.minTrust) query.depositPoints = { $lte: Number(req.user.trustPoints || 0) };

  const tools = await Tool.find(query)
    .populate("owner", "fullName email trustPoints")
    .populate("category", "name icon")
    .sort({ healthScore: -1, createdAt: -1 });
  res.json({ tools });
});

export const getTool = asyncHandler(async (req, res) => {
  const tool = await Tool.findById(req.params.id).populate("owner", "fullName email phone trustPoints").populate("category", "name icon");
  if (!tool) return res.status(404).json({ message: "Tool not found" });
  res.json({ tool });
});

export const createTool = asyncHandler(async (req, res) => {
  if (Number(req.body.depositPoints || 0) < 5) {
    return res.status(400).json({ message: "Escrow must be at least 5 trust points for safer lending." });
  }
  if (!req.body.category) return res.status(400).json({ message: "Choose a category before listing a tool." });
  if (!req.body.images?.length) return res.status(400).json({ message: "Add at least one listing image URL." });

  const tool = await Tool.create({
    ...req.body,
    owner: req.user._id,
    community: req.user.community,
    images: req.body.images || []
  });
  await audit(req.user, "tool.create", "Tool", tool._id, { name: tool.name });
  res.status(201).json({ tool });
});

export const updateTool = asyncHandler(async (req, res) => {
  const tool = await Tool.findById(req.params.id);
  if (!tool) return res.status(404).json({ message: "Tool not found" });
  const isOwner = tool.owner.toString() === req.user._id.toString();
  const isAdmin = ["admin", "superAdmin"].includes(req.user.role);
  if (!isOwner && !isAdmin) return res.status(403).json({ message: "Only owner or admin can update this tool" });

  Object.assign(tool, req.body);
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
