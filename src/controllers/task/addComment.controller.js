import mongoose from "mongoose";
import { Task } from "../../models/index.js";
import { ApiErrors } from "../../utils/ApiErrors.js";
import { asyncHandler } from "../../utils/asyncHandlers.js";

const addComment = asyncHandler(async (req, res, _next) => {
  const { content } = req.body;

  if (!content) {
    throw new ApiErrors(400, "Comment content is required");
  }

  const task = await Task.findById(req.params.id).select("_id").lean();

  if (!task) {
    throw new ApiErrors(404, "Task not found");
  }

  const newComment = {
    content,
    author: new mongoose.Types.ObjectId(req.user._id),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const updatedTask = await Task.findByIdAndUpdate(req.params.id, { $push: { comments: newComment } }, { new: true })
    .populate("comments.author", "name email")
    .lean();

  res.status(201).json({ success: true, data: { task: updatedTask } });
});

export default addComment;