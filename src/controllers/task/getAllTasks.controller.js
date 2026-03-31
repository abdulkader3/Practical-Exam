import { Task, User } from "../../models/index.js";
import { asyncHandler } from "../../utils/asyncHandlers.js";

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
          pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0 },
        },
      });
    }
  }

  if (search) {
    matchStage.$text = { $search: search };
  }

  const aggregationPipeline = [
    { $match: matchStage },
    { $lookup: { from: "users", localField: "createdBy", foreignField: "_id", as: "createdBy" } },
    { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
    { $lookup: { from: "users", localField: "assignedTo", foreignField: "_id", as: "assignedTo" } },
    { $unwind: { path: "$assignedTo", preserveNullAndEmptyArrays: true } },
    { $project: { "createdBy.passwordHash": 0, "createdBy.refreshToken": 0, "assignedBy.passwordHash": 0, "assignedTo.refreshToken": 0 } },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limitNum }
  ];

  const [tasks, totalResult] = await Promise.all([
    Task.aggregate(aggregationPipeline),
    Task.aggregate([{ $match: matchStage }, { $count: "total" }])
  ]);

  const total = totalResult[0]?.total || 0;

  res.status(200).json({
    success: true,
    data: {
      tasks,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    },
  });
});

export default getAllTasks;