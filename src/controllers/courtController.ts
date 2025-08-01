import { Request, Response } from "express";
import Court from "../models/Court";
import Reservation from "../models/Reservation";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const TIME_RANGES: Record<string, { start: string; end: string }> = {
    morning: { start: "08:00", end: "12:00" },
    afternoon: { start: "12:00", end: "18:00" },
    evening: { start: "18:00", end: "22:00" },
};

export const createCourt = async (req: Request, res: Response) => {
    try {
        const court = new Court(req.body);
        const savedCourt = await court.save();
        res.status(201).json({
            message: "Cancha creada exitosamente.",
            data: savedCourt,
        });
    } catch (err) {
        console.error("Error al crear cancha:", err);
        res.status(500).json({ message: "Error interno al crear la cancha." });
    }
};

export const getAllCourts = async (_req: Request, res: Response) => {
    try {
        const courts = await Court.find({ isDeleted: false });
        res.status(200).json(courts);
    } catch (err) {
        console.error("Error al obtener canchas:", err);
        res.status(500).json({ message: "Error interno al obtener canchas." });
    }
};

export const getCourtById = async (req: Request, res: Response) => {
    try {
        const court = await Court.findById(req.params.id);
        if (!court) return res.status(404).json({ message: "Cancha no encontrada." });
        res.status(200).json(court);
    } catch (err) {
        console.error("Error al obtener cancha:", err);
        res.status(500).json({ message: "Error interno." });
    }
};

export const updateCourt = async (req: Request, res: Response) => {
    try {
        const updatedCourt = await Court.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!updatedCourt) return res.status(404).json({ message: "Cancha no encontrada." });
        res.status(200).json({ message: "Cancha actualizada.", data: updatedCourt });
    } catch (err) {
        console.error("Error al actualizar cancha:", err);
        res.status(500).json({ message: "Error interno al actualizar la cancha." });
    }
};

export const deleteCourt = async (req: Request, res: Response) => {
    try {
        const court = await Court.findById(req.params.id);

        if (!court) {
            return res.status(404).json({ message: "Cancha no encontrada." });
        }

        if (court.isDeleted) {
            return res.status(400).json({ message: "La cancha ya ha sido eliminada." });
        }

        court.isDeleted = true;
        await court.save();

        res.status(200).json({ message: `Cancha marcada como eliminada ${court}.` });
    } catch (err) {
        console.error("Error en borrado lógico:", err);
        res.status(500).json({ message: "Error interno al eliminar la cancha." });
    }
};

export const availableCourts = async (req: Request, res: Response) => {
    try {
        const { date, timeRange, type } = req.query;

        if (!date || !timeRange || !type) {
            return res.status(400).json({ message: "Debe enviar fecha, rango horario y tipo de deporte." });
        }

        const { start, end } = TIME_RANGES[timeRange as string] || {};

        if (!start || !end) {
            return res.status(400).json({ message: "Rango horario inválido." });
        }

        const dayName = format(parseISO(date as string), "EEEE", { locale: es }).toLowerCase();

        const courts = await Court.find({
            type: type,
            status: { $in: ["activo", "cancelada"] },
            isDeleted: false,
            operatingDays: { $in: [dayName] }
        });

        //Filtrar canchas que no tengan reserva en el rango especificado
        const availableCourts = [];

        for (const court of courts) {
            const overlapping = await Reservation.findOne({
                court: court._id,
                date,
                status: { $ne: "cancelada" },
                $or: [
                    { startTime: { $lt: end }, endTime: { $gt: start } }
                ]
            });

            if (!overlapping) {
                availableCourts.push(court);
            }
        }

        res.status(200).json({ message: "Canchas disponibles", data: availableCourts });
    } catch (error) {
        console.error("Error al buscar canchas disponibles:", error);
        res.status(500).json({ message: "Error interno al buscar canchas." });
    }
};

export const unavailableDates = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const court = await Court.findById(id);
        if (!court) {
            return res.status(404).json({ message: "Cancha no encontrada" });
        }

        const courtStart = parseInt(court.hourStartTime.replace(":", ""));
        const courtEnd = parseInt(court.hourEndTime.replace(":", ""));
        const totalBlocks = (courtEnd - courtStart) / 100;

        const reservations = await Reservation.find({ court: id, status: { $ne: "cancelada" } });

        const dateMap: Record<string, number> = {};

        reservations.forEach((r) => {
            const start = parseInt(r.startTime.replace(":", ""));
            const end = parseInt(r.endTime.replace(":", ""));
            const blocks = (end - start) / 100;

            dateMap[r.date] = (dateMap[r.date] || 0) + blocks;
        });

        const unavailableDates = Object.entries(dateMap)
            .filter(([_, blocks]) => blocks >= totalBlocks)
            .map(([date]) => date);

        res.status(200).json({ message: "Fechas no disponible", data: unavailableDates });

    } catch (error) {
        console.error("Error al buscar canchas disponibles:", error);
        res.status(500).json({ message: "Error interno al buscar canchas." });
    }
};

export const occupiedTimes = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { date } = req.query;

        if (!date || typeof date !== "string") {
            return res.status(400).json({ message: "Se requiere una fecha válida." });
        }

        const court = await Court.findById(id);
        if (!court) {
            return res.status(404).json({ message: "Cancha no encontrada." });
        }

        const reservations = await Reservation.find({ court: id, date, status: { $ne: "cancelada" } });

        const occupied: string[] = [];

        reservations.forEach((r) => {
            const start = parseInt(r.startTime.replace(":", ""));
            const end = parseInt(r.endTime.replace(":", ""));

            for (let t = start; t < end; t += 100) {
                occupied.push(t.toString().padStart(4, "0").replace(/(\d{2})(\d{2})/, "$1:$2"));
            }
        });

        res.status(200).json({message: "Horas ocupadas", data: occupied });
    } catch (err) {
        console.error("Error al obtener horarios ocupados:", err);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};