import { ApiErrors } from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandlers.js";

export const checkRole = (...allowedRoles) => {

  return asyncHandler(async (req, res, next) => {

    if (!req.user) {

      throw new ApiErrors(401, "Authentication required");
    }

    if (!allowedRoles.includes(req.user.role)) {
      
      throw new ApiErrors(403, `Access denied. Required roles: ${allowedRoles.join(", ")}`);
    }

    next();
  });
};

export const requireAdmin = checkRole("admin");
