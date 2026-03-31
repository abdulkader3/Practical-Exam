import { Task, AuditLog } from "../../models/index.js";
import { asyncHandler } from "../../utils/asyncHandlers.js";

const createTask = asyncHandler(async (req, res, _next) => {
  const { title, description, status, priority, dueDate, tags, assignedTo } = req.body;

  const task = await Task.create({
    title,
    description,
    status,
    priority,
    dueDate,
    tags,
    assignedTo,
    createdBy: req.user._id,
  });

  const taskWithUsers = await Task.findById(task._id)
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .lean();

  await AuditLog.create({
    operation: "create",
    collection: "tasks",
    docId: task._id,
    userId: req.user._id,
    userEmail: req.user.email,
    after: taskWithUsers,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  res.status(201).json({
    success: true,
    data: { task: taskWithUsers },
  });
});

export default createTask;