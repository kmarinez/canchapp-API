import { Router } from "express";
import { verifyToken, authorizeRoles } from "../middlewares/authMiddleware";
import { getAdminDashboard } from "../controllers/dashboardController";

const router = Router();

router.get(
  "/dashboard",
  verifyToken,
  authorizeRoles("admin"),
  getAdminDashboard
);

export default router;
