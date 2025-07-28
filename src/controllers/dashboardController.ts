import { Request, Response } from "express";
import Reservation from "../models/Reservation";
import User from "../models/User";
import Court from "../models/Court";

export const getAdminDashboard = async (req: Request, res: Response) => {
    try {
        const today = new Date().toLocaleDateString('en-CA', {
            timeZone: 'America/Santo_Domingo'
        });

        const totalReservations = await Reservation.countDocuments();

        const totalActiveUsers = await User.countDocuments({ isActive: true });

        const courts = await Court.find({ status: "activo", isDeleted: false });

        let totalSlots = 0;
        let reservedSlots = 0;

        for (const court of courts) {
            const hourStart = parseInt(court.hourStartTime.replace(":", ""));
            const hourEnd = parseInt(court.hourEndTime.replace(":", ""));
            const hoursAvailable = (hourEnd - hourStart) / 100;
            totalSlots += hoursAvailable;

            const reservations = await Reservation.find({
                court: court._id,
                date: today,
                status: { $ne: "cancelada" },
            });

            for (const r of reservations) {
                const s = parseInt(r.startTime.replace(":", ""));
                const e = parseInt(r.endTime.replace(":", ""));
                reservedSlots += (e - s) / 100;
            }
        }

        const occupancyRateToday = totalSlots === 0 ? 0 : Math.round((reservedSlots / totalSlots) * 100);

        const recentReservations = await Reservation.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("user", "name lastName email")
            .populate("court", "courtName")
            .select("date startTime endTime status court user")
            .lean();

        res.json({
            totalReservations,
            totalActiveUsers,
            occupancyRateToday,
            recentReservations,
        });
    } catch (err) {
        console.error("Error en dashboard admin:", err);
        res.status(500).json({ message: "Error interno del servidor." });
    }
}