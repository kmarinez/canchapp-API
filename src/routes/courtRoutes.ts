import { Router } from "express";
import { availableCourts, createCourt, deleteCourt, getAllCourts, getCourtById, occupiedTimes, unavailableDates, updateCourt } from "../controllers/courtController";
import { verifyToken, authorizeRoles } from "../middlewares/authMiddleware";

const router = Router();

router.get("/available", availableCourts);
router.get("/:id/unavailable-dates", unavailableDates);
router.get("/:id/occupied-times", occupiedTimes);
router.get("/", getAllCourts);
router.get("/:id", getCourtById);

router.post("/", verifyToken, authorizeRoles("admin", "staff"), createCourt);
router.put("/:id", verifyToken, authorizeRoles("admin", "staff"), updateCourt);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteCourt);


export default router;
