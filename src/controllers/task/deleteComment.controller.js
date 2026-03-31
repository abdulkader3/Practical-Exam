import mongoose from "mongoose";
import { Task } from "../../models/index.js";
import { ApiErrors } from "../../utils/ApiErrors.js";
import { asyncHandler } from "../../utils/asyncHandlers.js";

const deleteComment = asyncHandler(async (req, res, _next) => {
  const { commentId } = req.params;

  const task = await Task.findById(req.params.id).select("comments").lean();

  if (!task) {
    throw new ApiErrors(404, "Task not found");
  }

  const comment = task.comments.find(c => c._id.toString() === commentId);

  if (!comment) {
    throw new ApiErrors(404, "Comment not found");
  }

  if (comment.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    throw new ApiErrors(403, "You can only delete your own comments");
  }

  await Task.findByIdAndUpdate(req.params.id, { $pull: { comments: { _id: new mongoose.Types.ObjectId(commentId) } } });

  res.status(200).json({ success: true, message: "Comment deleted successfully" });
});

export default deleteComment;