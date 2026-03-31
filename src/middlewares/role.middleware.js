import { ApiErrors } from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandlers.js";

export const isAdmin = asyncHandler(async (req, res, next) => {
  if (req.user?.role !== "admin") {
    throw new ApiErrors(403, "Admin access required");
  }
  next();
});

export const isOwnerOrAdmin = (modelField = "createdBy") => {
  return asyncHandler(async (req, res, next) => {
    const resourceId = req.params.id;
    
    if (!resourceId || !mongoose.Types.ObjectId.isValid(resourceId)) {
      throw new ApiErrors(400, "Invalid resource ID");
    }

    const resource = await req.taskModel?.findById(resourceId) || 
                     await mongoose.model(req.params.collection || "Task")?.findById(resourceId);

    if (!resource) {
      throw new ApiErrors(404, "Resource not found");
    }

    const resourceOwner = resource[modelField];
    const isOwner = resourceOwner?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      throw new ApiErrors(403, "You can only access your own resources");
    }

    req.resource = resource;
    next();
  });
};

export const filterByUser = (userField = "_id") => {
  return asyncHandler(async (req, res, next) => {
    if (req.user.role === "admin") {
      return next();
    }

    req.userFilter = { [userField]: req.user._id };
    next();
  });
};