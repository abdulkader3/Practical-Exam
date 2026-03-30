import { v2 as cloudinary } from "cloudinary";
import { User, AuditLog } from "../models/index.js";
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
  const user = await User.findById(req.params.id).select(
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

const updateProfile = asyncHandler(async (req, res, _next) => {
  const { name, phone, company } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiErrors(404, "User not found");
  }

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (company !== undefined) user.company = company;

  if (req.file) {
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    if (user.profileImage?.publicId) {
      await cloudinary.uploader.destroy(user.profileImage.publicId);
    }

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "ok_backend/profile_images",
      resource_type: "image",
      transformation: [
        { width: 500, height: 500, crop: "fill", gravity: "face" },
        { quality: "auto", fetch_format: "auto" },
      ],
    });

    user.profileImage = {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  await user.save();

  res.status(200).json({
    success: true,
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        company: user.company,
        role: user.role,
        profileImage: user.profileImage,
      },
    },
    message: "Profile updated successfully",
  });
});

const deactivateUser = asyncHandler(async (req, res, _next) => {
  const { id } = req.params;

  const targetUser = await User.findById(id);

  if (!targetUser) {
    throw new ApiErrors(404, "User not found");
  }

  if (targetUser.role === "admin" && req.user.role !== "admin") {
    throw new ApiErrors(403, "Only admin can deactivate admin users");
  }

  targetUser.active = false;
  await targetUser.save();

  await AuditLog.create({
    operation: "update",
    collection: "users",
    docId: targetUser._id,
    userId: req.user._id,
    userEmail: req.user.email,
    changes: [{ field: "active", oldValue: true, newValue: false }],
  });

  res.status(200).json({
    success: true,
    message: "User deactivated successfully",
  });
});

export {
  getAllUsers,
  getUserById,
  deactivateUser,
  updateProfile,
};
