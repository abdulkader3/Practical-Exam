import { Router } from "express";
import {
  getAllUsers,
  getUserById,
} from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/permission.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", requireAdmin, getAllUsers);
router.get("/:id", getUserById);

export default router;
