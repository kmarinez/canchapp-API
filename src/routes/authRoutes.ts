import { Router } from "express";
import { register, login, getCurrentUser, logout, resetPassword, verifyAccount } from "../controllers/authController";
import { verifyToken } from "../middlewares/authMiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login)); 
router.post("/logout", asyncHandler(logout));
router.get("/me", verifyToken, asyncHandler(getCurrentUser));
router.post("/resetpassword", asyncHandler(resetPassword));
router.post("/verifyAccount", asyncHandler(verifyAccount));



export default router;
