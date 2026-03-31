import { User, AuditLog } from "../../models/index.js";
import { asyncHandler } from "../../utils/asyncHandlers.js";

const logout = asyncHandler(async (req, res, _next) => {
  const user = req.user;

  await User.findByIdAndUpdate(user._id, { refreshToken: null });

  await AuditLog.create({ operation: "logout", collection: "users", docId: user._id, userId: user._id, userEmail: user.email, ipAddress: req.ip, userAgent: req.get("user-agent") });

  res.status(200).clearCookie("refreshToken").clearCookie("accessToken").json({ success: true, message: "Logout successful" });
});

export default logout;