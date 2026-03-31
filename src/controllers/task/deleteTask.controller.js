import { Task, AuditLog } from "../../models/index.js";
import { ApiErrors } from "../../utils/ApiErrors.js";
import { asyncHandler } from "../../utils/asyncHandlers.js";

const deleteTask = asyncHandler(async (req, res, _next) => {
  const task = await Task.findById(req.params.id).select("_id createdBy").lean();

  if (!task) {
    throw new ApiErrors(404, "Task not found");
  }

  if (task.createdBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    throw new ApiErrors(403, "You can only delete your own tasks");
  }

  await Task.findByIdAndDelete(req.params.id);

  await AuditLog.create({
    operation: "delete",
    collection: "tasks",
    docId: task._id,
    userId: req.user._id,
    userEmail: req.user.email,
    before: task,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  res.status(200).json({ success: true, message: "Task deleted successfully" });
});

export default deleteTask;