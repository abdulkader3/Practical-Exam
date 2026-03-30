import { Task } from "../models/index.js";
import { User } from "../models/index.js";
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

  res.status(201).json({
    success: true,
    data: { task },
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
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = {};

  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  if (email) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      filter.$or = [
        { createdBy: user._id },
        { assignedTo: user._id }
      ];
    } else {
      return res.status(200).json({
        success: true,
        data: {
          tasks: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0,
          },
        },
      });
    }
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = filter.$or || [];
    filter.$or.push(
      { title: searchRegex },
      { description: searchRegex },
      { 'tags.name': searchRegex },
      { 'comments.content': searchRegex }
    );
  }

  const tasks = await Task.find(filter)
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Task.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: {
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

const getTaskById = asyncHandler(async (req, res, _next) => {
  const task = await Task.findById(req.params.id)
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .populate("comments.author", "name email");

  if (!task) {
    throw new ApiErrors(404, "Task not found");
  }

  const isOwner = task.createdBy._id.toString() === req.user._id.toString();
  const isAssigned = task.assignedTo?._id?.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAssigned && !isAdmin) {
    throw new ApiErrors(403, "You can only view your own tasks");
  }

  res.status(200).json({
    success: true,
    data: { task },
  });
});

const updateTask = asyncHandler(async (req, res, _next) => {
  const { title, description, status, priority, dueDate, tags, assignedTo } = req.body;

  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new ApiErrors(404, "Task not found");
  }

  if (task.createdBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    throw new ApiErrors(403, "You can only update your own tasks");
  }

  if (title) task.title = title;
  if (description !== undefined) task.description = description;
  if (status) task.status = status;
  if (priority) task.priority = priority;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (tags) task.tags = tags;
  if (assignedTo !== undefined) task.assignedTo = assignedTo;

  await task.save();

  res.status(200).json({
    success: true,
    data: { task },
  });
});

const deleteTask = asyncHandler(async (req, res, _next) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new ApiErrors(404, "Task not found");
  }

  if (task.createdBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    throw new ApiErrors(403, "You can only delete your own tasks");
  }

  await Task.findByIdAndDelete(req.params.id);

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

  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new ApiErrors(404, "Task not found");
  }

  task.comments.push({
    content,
    author: req.user._id,
  });

  await task.save();

  const updatedTask = await Task.findById(req.params.id)
    .populate("comments.author", "name email");

  res.status(201).json({
    success: true,
    data: { task: updatedTask },
  });
});

const deleteComment = asyncHandler(async (req, res, _next) => {
  const { commentId } = req.params;

  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new ApiErrors(404, "Task not found");
  }

  const comment = task.comments.id(commentId);

  if (!comment) {
    throw new ApiErrors(404, "Comment not found");
  }

  if (comment.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    throw new ApiErrors(403, "You can only delete your own comments");
  }

  task.comments.pull(commentId);
  await task.save();

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
