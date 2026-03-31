import { Task, AuditLog } from "../../models/index.js";
import { ApiErrors } from "../../utils/ApiErrors.js";
import { asyncHandler } from "../../utils/asyncHandlers.js";

const updateTask = asyncHandler(async (req, res, _next) => {
  const { title, description, status, priority, dueDate, tags, assignedTo } = req.body;

  const task = await Task.findById(req.params.id).lean();

  if (!task) {
    throw new ApiErrors(404, "Task not found");
  }

  if (task.createdBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    throw new ApiErrors(403, "You can only update your own tasks");
  }

  const updateFields = {};
  if (title) updateFields.title = title;
  if (description !== undefined) updateFields.description = description;
  if (status) updateFields.status = status;
  if (priority) updateFields.priority = priority;
  if (dueDate !== undefined) updateFields.dueDate = dueDate;
  if (tags) updateFields.tags = tags;
  if (assignedTo !== undefined) updateFields.assignedTo = assignedTo;

  const updatedTask = await Task.findByIdAndUpdate(req.params.id, { $set: updateFields }, { new: true, runValidators: true })
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .lean();

  await AuditLog.create({
    operation: "update",
    collection: "tasks",
    docId: task._id,
    userId: req.user._id,
    userEmail: req.user.email,
    before: task,
    after: updatedTask,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  res.status(200).json({ success: true, data: { task: updatedTask } });
});

export default updateTask;