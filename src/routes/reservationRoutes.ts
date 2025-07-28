import { Router } from "express";
import { authorizeRoles, verifyToken } from "../middlewares/authMiddleware";
import { cancelReservation, createReservation, editReservation, findReservation, getMyReservations, listReservations, reservationSummary, verifyReservation } from "../controllers/reservationController";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/", verifyToken, asyncHandler(createReservation));
router.get("/summary", verifyToken, asyncHandler(reservationSummary));
router.get("/my", verifyToken, asyncHandler(getMyReservations));
router.post("/find", verifyToken, authorizeRoles("admin", "staff"), asyncHandler(findReservation));
router.post("/verify", verifyToken, authorizeRoles("admin", "staff"), asyncHandler(verifyReservation));
router.get("/", verifyToken, authorizeRoles("admin", "staff"), listReservations);
router.put("/:id/edit", verifyToken, asyncHandler(editReservation));
router.put("/:id/cancel", verifyToken, authorizeRoles("admin", "staff", "customer"), asyncHandler(cancelReservation));

export default router;