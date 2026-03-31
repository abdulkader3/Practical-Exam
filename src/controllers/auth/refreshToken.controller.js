import jwt from "jsonwebtoken";
import { User, AuditLog } from "../../models/index.js";
import { ApiErrors } from "../../utils/ApiErrors.js";
import { asyncHandler } from "../../utils/asyncHandlers.js";

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d" });
  const refreshToken = jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "10d" });
  return { accessToken, refreshToken };
};

const refreshAccessToken = asyncHandler(async (req, res, _next) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;

  if (!token) {
    throw new ApiErrors(401, "Refresh token required");
  }

  const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

  const user = await User.findOne({ _id: decodedToken.id, refreshToken: token }).select("+refreshToken").lean();

  if (!user) {
    throw new ApiErrors(401, "Invalid refresh token");
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

  await Promise.all([
    User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken }),
    AuditLog.create({ operation: "refresh", collection: "users", docId: user._id, userId: user._id, userEmail: user.email, ipAddress: req.ip, userAgent: req.get("user-agent") })
  ]);

  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" };

  res.status(200).cookie("refreshToken", newRefreshToken, options).cookie("accessToken", accessToken, options).json({
    success: true,
    data: { access_token: accessToken, refresh_token: newRefreshToken },
  });
});

export default refreshAccessToken;