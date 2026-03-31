import { Task, AuditLog } from "../../models/index.js";
import { ApiErrors } from "../../utils/ApiErrors.js";
import { asyncHandler } from "../../utils/asyncHandlers.js";

const getTaskById = asyncHandler(async (req, res, _next) => {
  const task = await Task.findById(req.params.id)
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .populate("comments.author", "name email")
    .lean();

  if (!task) {
    throw new ApiErrors(404, "Task not found");
  }

  const isOwner = task.createdBy._id.toString() === req.user._id.toString();
  const isAssigned = task.assignedTo?._id?.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAssigned && !isAdmin) {
    throw new ApiErrors(403, "You can only view your own tasks");
  }

  await AuditLog.create({
    operation: "view",
    collection: "tasks",
    docId: task._id,
    userId: req.user._id,
    userEmail: req.user.email,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  res.status(200).json({ success: true, data: { task } });
});

export default getTaskById;