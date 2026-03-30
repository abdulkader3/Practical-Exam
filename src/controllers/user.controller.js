import { v2 as cloudinary } from "cloudinary";
import { User } from "../models/index.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandlers.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_API_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getAllUsers = asyncHandler(async (req, res, _next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const users = await User.find()
    .select("-passwordHash -refreshToken")
    .skip(skip)
    .limit(limit);
  const total = await User.countDocuments();

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

const getUserById = asyncHandler(async (req, res, _next) => {
  const requestedUserId = req.params.id;
  const currentUser = req.user;

  if (currentUser.role !== "admin" && currentUser._id.toString() !== requestedUserId) {
    throw new ApiErrors(403, "You can only access your own data");
  }

  const user = await User.findById(requestedUserId).select(
    "-passwordHash -refreshToken"
  );

  if (!user) {
    throw new ApiErrors(404, "User not found");
  }

  res.status(200).json({
    success: true,
    data: { user },
  });
});





export {
  getAllUsers,
  getUserById
};
