import { Router } from "express";
import { authorizeRoles, verifyToken } from "../middlewares/authMiddleware";
import { cancelReservation, createReservation, editReservation, findReservation, getMyReservations, listReservations, reservationSummary, verifyReservation } from "../controllers/reservationController";

const router = Router();

router.post("/", verifyToken, createReservation);
router.get("/summary", verifyToken, reservationSummary);
router.get("/my", verifyToken, getMyReservations);
router.post("/find", verifyToken, authorizeRoles("admin", "staff"), findReservation);
router.post("/verify", verifyToken, authorizeRoles("admin", "staff"), verifyReservation);
router.get("/", verifyToken, authorizeRoles("admin", "staff"), listReservations);
router.put("/:id/edit", verifyToken, editReservation);
router.put("/:id/cancel", verifyToken, authorizeRoles("admin", "staff", "customer"), cancelReservation);

export default router;