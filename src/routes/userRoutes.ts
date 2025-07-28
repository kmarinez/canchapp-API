import { Router } from "express";
import { authorizeRoles, verifyToken } from "../middlewares/authMiddleware";
import { listUser, requestPasswordReset, resendVerificationCode, updateUser } from "../controllers/userController";

const router = Router();

router.get("/", verifyToken, authorizeRoles("admin", "staff"), listUser);
router.put("/:id/update", verifyToken, authorizeRoles("admin", "staff", "customer"), updateUser);
router.post("/passwordrecovery", requestPasswordReset);
router.post("/resend-code", resendVerificationCode);

export default router;