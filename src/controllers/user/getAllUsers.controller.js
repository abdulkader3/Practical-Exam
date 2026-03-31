import { User } from "../../models/index.js";
import { asyncHandler } from "../../utils/asyncHandlers.js";

const getAllUsers = asyncHandler(async (req, res, _next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find({}).select("-passwordHash -refreshToken").skip(skip).limit(limit).lean(),
    User.countDocuments()
  ]);

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
});

export default getAllUsers;