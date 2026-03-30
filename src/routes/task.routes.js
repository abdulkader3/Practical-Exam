import { Router } from "express";
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addComment,
  deleteComment,
} from "../controllers/task.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/permission.middleware.js";

const router = Router();

router.use(authenticate);

router.post("/", createTask);
router.get("/", requireAdmin, getAllTasks);
router.get("/:id", getTaskById);
router.put("/:id", updateTask);
router.delete("/:id", deleteTask);
router.post("/:id/comments", addComment);
router.delete("/:id/comments/:commentId", deleteComment);

export default router;
