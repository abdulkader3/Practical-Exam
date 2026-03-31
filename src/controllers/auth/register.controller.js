import jwt from "jsonwebtoken";
import { User, AuditLog } from "../../models/index.js";
import { ApiErrors } from "../../utils/ApiErrors.js";
import { asyncHandler } from "../../utils/asyncHandlers.js";

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d" });
  const refreshToken = jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "10d" });
  return { accessToken, refreshToken };
};

const register = asyncHandler(async (req, res, _next) => {
  const { name, email, password, phone, company, role, monthlySalary } = req.body;

  const existingUser = await User.findOne({ email: email?.toLowerCase() }).select("_id").lean();
  if (existingUser) {
    throw new ApiErrors(409, "Email already registered");
  }

  const userRole = role || "user";
  const [userCount] = await Promise.all([User.countDocuments()]);
  const isFirstUser = userCount === 0;
  const finalRole = isFirstUser ? "admin" : userRole;

  const userData = { name, email: email?.toLowerCase(), passwordHash: password, phone, company, role: finalRole };

  const isAuthenticated = !!req.user;
  const isFirstUserRegistration = isFirstUser;

  if (isAuthenticated && !isFirstUserRegistration && finalRole === "admin") {
    userData.ownerId = req.user._id;
  }

  if (monthlySalary !== undefined && finalRole === "admin") {
    userData.monthlySalary = parseFloat(monthlySalary) || null;
  }

  const user = await User.create(userData);

  if (!isAuthenticated || isFirstUserRegistration) {
    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    const options = { httpOnly: true, secure: true };

    await AuditLog.create({ operation: "create", collection: "users", docId: user._id, userId: user._id, userEmail: user.email, after: user.toJSON() });

    res.status(201).cookie("refreshToken", refreshToken, options).cookie("accessToken", accessToken, options).json({
      success: true,
      data: { user: user.toJSON(), tokens: { access_token: accessToken, refresh_token: refreshToken } },
      message: "User registered successfully",
    });
  } else {
    await AuditLog.create({ operation: "create", collection: "users", docId: user._id, userId: req.user._id, userEmail: req.user.email, after: user.toJSON() });
    res.status(201).json({ success: true, data: { user: user.toJSON() }, message: "Staff member created successfully" });
  }
});

export default register;