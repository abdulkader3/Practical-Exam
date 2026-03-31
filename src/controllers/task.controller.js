import mongoose from "mongoose";
import { Task, User, AuditLog } from "../models/index.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandlers.js";

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

const getAllTasks = asyncHandler(async (req, res, _next) => {
  const { 
    search, 
    email, 
    status, 
    priority, 
    page = 1, 
    limit = 20 
  } = req.query;
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const matchStage = {};

  if (status) matchStage.status = status;
  if (priority) matchStage.priority = priority;

  if (req.user.role !== "admin") {
    matchStage.$or = [
      { createdBy: req.user._id },
      { assignedTo: req.user._id }
    ];
  } else if (email) {
    const user = await User.findOne({ email: email.toLowerCase() }).select("_id").lean();
    if (user) {
      matchStage.$or = [
        { createdBy: user._id },
        { assignedTo: user._id }
      ];
    } else {
      return res.status(200).json({
        success: true,
        data: {
          tasks: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            pages: 0,
          },
        },
      });
    }
  }

  if (search) {
    matchStage.$text = { $search: search };
  }

  const aggregationPipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "createdBy"
      }
    },
    { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "assignedTo",
        foreignField: "_id",
        as: "assignedTo"
      }
    },
    { $unwind: { path: "$assignedTo", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        "createdBy.passwordHash": 0,
        "createdBy.refreshToken": 0,
        "assignedTo.passwordHash": 0,
        "assignedTo.refreshToken": 0
      }
    },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limitNum }
  ];

  const [tasks, totalResult] = await Promise.all([
    Task.aggregate(aggregationPipeline),
    Task.aggregate([
      { $match: matchStage },
      { $count: "total" }
    ])
  ]);

  const total = totalResult[0]?.total || 0;

  res.status(200).json({
    success: true,
    data: {
      tasks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

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

  res.status(200).json({
    success: true,
    data: { task },
  });
});

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

  const updatedTask = await Task.findByIdAndUpdate(
    req.params.id,
    { $set: updateFields },
    { new: true, runValidators: true }
  )
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

  res.status(200).json({
    success: true,
    data: { task: updatedTask },
  });
});

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

  res.status(200).json({
    success: true,
    message: "Task deleted successfully",
  });
});

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

  const updatedTask = await Task.findByIdAndUpdate(
    req.params.id,
    { $push: { comments: newComment } },
    { new: true }
  )
    .populate("comments.author", "name email")
    .lean();

  res.status(201).json({
    success: true,
    data: { task: updatedTask },
  });
});

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

  await Task.findByIdAndUpdate(req.params.id, {
    $pull: { comments: { _id: new mongoose.Types.ObjectId(commentId) } }
  });

  res.status(200).json({
    success: true,
    message: "Comment deleted successfully",
  });
});

export {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addComment,
  deleteComment,
};