import jwt from "jsonwebtoken";
import { User, AuditLog } from "../../models/index.js";
import { ApiErrors } from "../../utils/ApiErrors.js";
import { asyncHandler } from "../../utils/asyncHandlers.js";

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d" });
  const refreshToken = jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "10d" });
  return { accessToken, refreshToken };
};

const login = asyncHandler(async (req, res, _next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email?.toLowerCase() }).select("+refreshToken").lean();

  if (!user) {
    throw new ApiErrors(401, "Invalid email or password");
  }

  const isPasswordValid = await User.schema.methods.comparePassword.call({ passwordHash: user.passwordHash }, password);

  if (!isPasswordValid) {
    throw new ApiErrors(401, "Invalid email or password");
  }

  if (!user.active) {
    throw new ApiErrors(403, "User account is inactive");
  }

  const { accessToken, refreshToken } = generateTokens(user._id);

  await Promise.all([
    User.findByIdAndUpdate(user._id, { refreshToken, lastLogin: new Date() }),
    AuditLog.create({ operation: "login", collection: "users", docId: user._id, userId: user._id, userEmail: user.email, ipAddress: req.ip, userAgent: req.get("user-agent") })
  ]);

  const options = { httpOnly: true, secure: true };

  res.status(200).cookie("refreshToken", refreshToken, options).cookie("accessToken", accessToken, options).json({
    success: true,
    data: { user, tokens: { access_token: accessToken, refresh_token: refreshToken } },
    message: "Login successful",
  });
});

export default login;