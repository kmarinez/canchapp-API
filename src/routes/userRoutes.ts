import { Router } from "express";
import { authorizeRoles, verifyToken } from "../middlewares/authMiddleware";
import { listUser, requestPasswordReset, resendVerificationCode, updateUser } from "../controllers/userController";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", verifyToken, authorizeRoles("admin", "staff"), asyncHandler(listUser));
router.put("/:id/update", verifyToken, authorizeRoles("admin", "staff", "customer"), asyncHandler(updateUser));
router.post("/passwordrecovery", asyncHandler(requestPasswordReset));
router.post("/resend-code", asyncHandler(resendVerificationCode));

export default router;