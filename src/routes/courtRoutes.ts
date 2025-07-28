import { Router } from "express";
import { availableCourts, createCourt, deleteCourt, getAllCourts, getCourtById, occupiedTimes, unavailableDates, updateCourt } from "../controllers/courtController";
import { verifyToken, authorizeRoles } from "../middlewares/authMiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/available", asyncHandler(availableCourts));
router.get("/:id/unavailable-dates", asyncHandler(unavailableDates));
router.get("/:id/occupied-times", asyncHandler(occupiedTimes));
router.get("/", asyncHandler(getAllCourts));
router.get("/:id", asyncHandler(getCourtById));

router.post("/", verifyToken, authorizeRoles("admin", "staff"), asyncHandler(createCourt));
router.put("/:id", verifyToken, authorizeRoles("admin", "staff"), asyncHandler(updateCourt));
router.delete("/:id", verifyToken, authorizeRoles("admin"), asyncHandler(deleteCourt));


export default router;
