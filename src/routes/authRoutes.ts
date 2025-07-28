import { Router } from "express";
import { register, login, getCurrentUser, logout, resetPassword, verifyAccount } from "../controllers/authController";
import { verifyToken } from "../middlewares/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login); 
router.post("/logout", logout);
router.get("/me", verifyToken, getCurrentUser);
router.post("/resetpassword", resetPassword);
router.post("/verifyAccount", verifyAccount);



export default router;
