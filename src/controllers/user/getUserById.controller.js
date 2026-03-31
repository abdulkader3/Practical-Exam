import { User, AuditLog } from "../../models/index.js";
import { ApiErrors } from "../../utils/ApiErrors.js";
import { asyncHandler } from "../../utils/asyncHandlers.js";

const getUserById = asyncHandler(async (req, res, _next) => {
  const requestedUserId = req.params.id;
  const currentUser = req.user;

  if (currentUser.role !== "admin" && currentUser._id.toString() !== requestedUserId) {
    throw new ApiErrors(403, "You can only access your own data");
  }

  const user = await User.findById(requestedUserId).select("-passwordHash -refreshToken").lean();

  if (!user) {
    throw new ApiErrors(404, "User not found");
  }

  await AuditLog.create({
    operation: "view",
    collection: "users",
    docId: user._id,
    userId: currentUser._id,
    userEmail: currentUser.email,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  res.status(200).json({ success: true, data: { user } });
});

export default getUserById;