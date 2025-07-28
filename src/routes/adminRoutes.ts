import { Router } from "express";
import { verifyToken, authorizeRoles } from "../middlewares/authMiddleware";
import { getAdminDashboard } from "../controllers/dashboardController";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get(
  "/dashboard",
  verifyToken,
  authorizeRoles("admin"),
  asyncHandler(getAdminDashboard)
);

export default router;
