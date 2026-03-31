import { Router } from "express";
import { getAllUsers, getUserById } from "../controllers/user/index.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", getAllUsers);
router.get("/:id", getUserById);

export default router;