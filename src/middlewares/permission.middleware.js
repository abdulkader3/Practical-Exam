import { ApiErrors } from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandlers.js";

export const requireAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiErrors(401, "Authentication required");
  }

  if (req.user.role !== "admin") {
    throw new ApiErrors(403, "Admin access required");
  }

  next();
});
