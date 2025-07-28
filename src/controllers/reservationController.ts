import { Request, Response } from "express";
import Court from "../models/Court";
import Reservation from "../models/Reservation";
import User from "../models/User";
import { transporter } from "../utils/mailer";

export const createReservation = async (req: Request, res: Response) => {
  try {
    const { courtId, date, startTime, endTime, peopleCount, reservedFor } =
      req.body;

    const pin = Math.floor(1000 + Math.random() * 9000).toString(); // pin de 4 dígitos

    if (!courtId || !date || !startTime || !endTime || !peopleCount) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios." });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res
        .status(400)
        .json({ message: "Formato de fecha inválido. Usa YYYY-MM-DD." });
    }

    const todayStr = new Date().toLocaleDateString("en-CA");
    console.log("Hoy local:", todayStr);
    console.log("Fecha solicitada:", date);
    if (date < todayStr) {
      return res
        .status(400)
        .json({ message: "No puedes reservar para fechas pasadas." });
    }

    const court = await Court.findById(courtId);
    if (!court) {
      return res.status(404).json({ message: "Cancha no encontrada." });
    }

    if (court.status !== "activo" || court.isDeleted) {
      return res
        .status(400)
        .json({ message: "La cancha no está disponible para reservas." });
    }

    // Validar día de operación
    if (court.operatingDays && court.operatingDays.length > 0) {
      const [year, month, day] = date.split("-");
      const localDate = new Date(Number(year), Number(month) - 1, Number(day));
      const dayName = localDate
        .toLocaleDateString("es-ES", { weekday: "long" })
        .toLowerCase();
      if (!court.operatingDays.includes(dayName)) {
        return res
          .status(400)
          .json({ message: `La cancha no opera los ${dayName}.` });
      }
    }

    const courtStart = parseInt(court.hourStartTime.replace(":", ""));
    const courtEnd = parseInt(court.hourEndTime.replace(":", ""));
    const start = parseInt(startTime.replace(":", ""));
    const end = parseInt(endTime.replace(":", ""));

    if (start >= end) {
      return res.status(400).json({
        message: "La hora de inicio debe ser antes de la hora de fin.",
      });
    }

    if (start < courtStart || end > courtEnd) {
      return res.status(400).json({
        message: `El horario permitido para esta cancha es de ${court.hourStartTime} a ${court.hourEndTime}.`,
      });
    }

    // Validar que no haya traslape de horario en la misma cancha
    const overlapping = await Reservation.findOne({
      court: courtId,
      date: date,
      status: { $ne: "cancelada" }, 
      $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
    });

    if (overlapping) {
      return res
        .status(409)
        .json({ message: "La cancha ya está reservada en ese horario." });
    }

    const userOverlap = await Reservation.findOne({
      court: courtId,
      user: req.user?.id,
      date,
      status: { $ne: "cancelada" },
      $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
    });
    if (userOverlap) {
      return res.status(409).json({
        message: "Ya tienes una reserva en ese horario para esta cancha.",
      });
    }

    if (peopleCount < 1) {
      return res
        .status(400)
        .json({ message: "Debes reservar para al menos una persona." });
    }
    if (peopleCount > court.playerCapacity) {
      return res.status(400).json({
        message: `La cancha tiene capacidad máxima de ${court.playerCapacity} personas.`,
      });
    }

    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    const reservedForName = reservedFor || `${user.name} ${user.lastName}`;
    const identificationNum = user.identificationNum;

    const reservation = new Reservation({
      court: courtId,
      user: req.user?.id,
      date,
      startTime,
      endTime,
      peopleCount,
      reservedFor: reservedForName,
      verifyCode: pin,
      identificationNum,
    });

    await reservation.save();

    console.log(reservation);

    res.status(201).json({
      message: "Reserva creada exitosamente.",
      data: reservation,
    });

    transporter.sendMail({
        from: '"CanchApp" <no-replay@canchapp.com>',
        to: user.email,
        subject: "Confirmación de reserva",
        html: `
        <div style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td align="left">
                    <h2 style="color: #1cb179;">¡Hola!</h2>
                    <p style="font-size: 16px; color: #333;">Tu reserva para la cancha se realizó correctamente.</p>

                    <p style="font-size: 16px; margin-top: 30px;">
                      <b>Código de reservación:</b> <span style="color: #1cb179; font-size: 18px;">${pin}</span>
                    </p>
                    <p style="font-size: 16px;"><b>Fecha:</b> ${date}</p>
                    <p style="font-size: 16px;"><b>Hora:</b> ${startTime} - ${endTime}</p>
                    ${reservedForName && (`<p style="font-size: 16px;"><b>Reservado para:</b> ${reservedForName}</p>`)}

                    <p style="margin-top: 40px; font-size: 15px; color: #555;">
                      ¡Gracias por usar <b>CanchApp</b>!
                    </p>

                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">

                    <p style="font-size: 13px; color: #999;">Este es un correo automático. No respondas a este mensaje.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
      `,
    }).then(() => {
        console.log("Correo enviado de forma exitosa");
    }).catch((err) => {
        console.log("Error al enviar correos", err);
    });
  } catch (err) {
    console.error("Error creando reserva:", err);
    res.status(500).json({ message: "Error interno al crear reserva." });
  }
};

export const verifyReservation = async (req: Request, res: Response) => {
  try {
    const { identificationNum, pinCode } = req.body;

    if (!identificationNum || !pinCode) {
      return res
        .status(400)
        .json({ message: "Se requiere ID de reserva y PIN." });
    }

    const reservation = await Reservation.findOne({
      identificationNum: identificationNum,
      verifyCode: pinCode,
    });

    if (!reservation) {
      return res.status(404).json({ message: "Reserva no encontrada." });
    }

    if (reservation.status !== "confirmada") {
      return res
        .status(400)
        .json({ message: "La reserva ya fue confirmada o usada." });
    }

    const todayStr = new Date().toLocaleDateString("en-CA");
    if (reservation.date < todayStr) {
      return res
        .status(400)
        .json({ message: "No puede ser confirmada reserva con fecha pasada." });
    }

    reservation.status = "usada";
    await reservation.save();

    res
      .status(200)
      .json({ message: "Reserva confirmada exitosamente.", data: reservation });
  } catch (err) {
    console.error("Error verificando reserva:", err);
    res.status(500).json({ message: "Error interno al verificar reserva." });
  }
};

export const findReservation = async (req: Request, res: Response) => {
  try {
    const { identificationNum, pinCode } = req.body;

    if (!identificationNum || !pinCode) {
      return res
        .status(400)
        .json({ message: "Se requiere ID de reserva y PIN." });
    }

    const reservation = await Reservation.findOne({
      identificationNum: identificationNum,
      verifyCode: pinCode,
    })
      .select(["-_id", "-user", "-verifyCode"])
      .populate({
        path: "court",
        select: "courtName",
      });

    if (!reservation) {
      return res.status(404).json({ message: "Reserva no encontrada." });
    }

    if (reservation.status !== "confirmada") {
      return res
        .status(400)
        .json({ message: "La reserva no puede ser confirmada." });
    }

    res.status(200).json({
      message: "Reserva encontrada",
      data: reservation,
    });
  } catch (err) {
    console.error("Error verificando reserva:", err);
    res.status(500).json({ message: "Error interno al verificar reserva." });
  }
};

export const listReservations = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const { courtName, userEmail, dateStart, dateEnd, status } = req.query;

    const filters: any = {};

    if (status) {
      filters.status = status;
    }

    if (dateStart && dateEnd) {
      filters.date = { $gte: dateStart, $lte: dateEnd };
    } else if (dateStart) {
      filters.date = { $gte: dateStart };
    } else if (dateEnd) {
      filters.date = { $lte: dateEnd };
    }

    let query = Reservation.find(filters)
      .populate({
        path: "court",
        select: "courtName location",
      })
      .populate({
        path: "user",
        select: "name lastName email",
      });

    if (courtName) {
      query = query
        .where("court.courtName")
        .regex(new RegExp(courtName as string, "i"));
    }

    if (userEmail) {
      query = query
        .where("user.email")
        .regex(new RegExp(userEmail as string, "i"));
    }

    const skip = (page - 1) * limit;

    const reservations = await query
      .sort({ date: -1, startTime: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    let countQuery = Reservation.find(filters)
      .populate({
        path: "court",
        select: "courtName",
      })
      .populate({
        path: "user",
        select: "email",
      });

    if (courtName) {
      countQuery = countQuery
        .where("court.courtName")
        .regex(new RegExp(courtName as string, "i"));
    }

    if (userEmail) {
      countQuery = countQuery
        .where("user.email")
        .regex(new RegExp(userEmail as string, "i"));
    }

    const totalReservations = await countQuery.countDocuments();

    const confirmaded = await Reservation.countDocuments({
      ...filters,
      status: "usada",
    });
    const pending = await Reservation.countDocuments({
      ...filters,
      status: "confirmada",
    });

    const today = new Date().toISOString().split("T")[0];
    const totalToday = await Reservation.countDocuments({
      ...filters,
      date: today,
    });

    res.status(200).json({
      page,
      totalPages: Math.ceil(totalReservations / limit),
      total: totalReservations,
      totalConfirmed: confirmaded,
      totalPending: pending,
      totalToday: totalToday,
      data: reservations,
    });
  } catch (err) {
    console.error("Error listando reservas:", err);
    res.status(500).json({ message: "Error interno al listar reservas." });
  }
};

export const getMyReservations = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const skip = (page - 1) * limit;

    const myReservations = await Reservation.find({ user: req.user?.id })
      .populate("court", "courtName type location")
      .sort({ date: -1, startTime: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalMyReservations = await Reservation.countDocuments({
      user: req.user?.id,
    });

    res.status(200).json({
      page,
      totalPages: Math.ceil(totalMyReservations / limit),
      total: totalMyReservations,
      data: myReservations,
    });
  } catch (err) {
    console.error("Error listando reservas del usuario:", err);
    res
      .status(500)
      .json({ message: "Error interno al listar reservas personales." });
  }
};

export const editReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { courtId, date, startTime, endTime, peopleCount, reservedFor } =
      req.body;

    const reservation = await Reservation.findById(id).populate("user");;
    if (!reservation) {
      return res.status(404).json({ message: "Reserva no encontrada." });
    }

    if (reservation.status === "usada") {
      return res
        .status(400)
        .json({ message: "No se puede editar una reserva ya utilizada." });
    }

    if (reservation.status === "cancelada") {
      return res
        .status(400)
        .json({ message: "No se puede editar una reserva cancelada." });
    }

    if (!courtId || !date || !startTime || !endTime || !peopleCount) {
      return res
        .status(400)
        .json({ message: "Todos los campos principales son obligatorios." });
    }

    // Validar fecha no pasada
    const todayStr = new Date().toLocaleDateString("en-CA");
    if (date < todayStr) {
      return res
        .status(400)
        .json({ message: "No puedes mover una reserva a una fecha pasada." });
    }

    // Validar cancha
    const court = await Court.findById(courtId);
    if (!court || court.status !== "activo" || court.isDeleted) {
      return res
        .status(400)
        .json({ message: "La nueva cancha no está disponible." });
    }

    // Validar horario permitido
    const courtStart = parseInt(court.hourStartTime.replace(":", ""));
    const courtEnd = parseInt(court.hourEndTime.replace(":", ""));
    const start = parseInt(startTime.replace(":", ""));
    const end = parseInt(endTime.replace(":", ""));

    if (start >= end) {
      return res
        .status(400)
        .json({ message: "Hora de inicio debe ser antes de la de fin." });
    }

    if (start < courtStart || end > courtEnd) {
      return res.status(400).json({
        message: `Horario permitido: ${court.hourStartTime} a ${court.hourEndTime}.`,
      });
    }

    // Validar traslape
    const overlapping = await Reservation.findOne({
      _id: { $ne: reservation._id },
      court: courtId,
      date: date,
      $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
    });

    if (overlapping) {
      return res.status(409).json({
        message: "Ya existe una reserva que se traslapa con este horario.",
      });
    }

    if (peopleCount < 1) {
      return res
        .status(400)
        .json({ message: "Debes reservar al menos para una persona." });
    }

    if (peopleCount > court.playerCapacity) {
      return res.status(400).json({
        message: `La cancha tiene capacidad máxima de ${court.playerCapacity} personas.`,
      });
    }

    // Actualizar campos
    reservation.court = courtId as any;
    reservation.date = date;
    reservation.startTime = startTime;
    reservation.endTime = endTime;
    reservation.peopleCount = peopleCount;
    reservation.reservedFor = reservedFor || reservation.reservedFor;

    await reservation.save();

    const emailTo = (reservation.user as any).email;

    if (!emailTo) {
      console.error("No se pudo enviar el correo: el usuario no tiene email.");
      return res.status(200).json({
        message: "Reserva actualizada, pero no se envió notificación por falta de email.",
        data: reservation,
      });
    }

    await transporter.sendMail({
      from: '"CanchApp" <no-reply@canchapp.com>',
      to: emailTo,
      subject: "Tu reserva fue modificada",
      html: `
        <div style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9f9f9;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding: 20px; background-color: #f9f9f9;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <tr>
                  <td align="left">
                    <h2 style="color: #1cb179;">¡Hola ${
                      (reservation.user as any).name
                    }!</h2>
                    <p style="font-size: 16px; color: #333;">Queremos confirmarte que tu reserva ha sido <strong>modificada exitosamente</strong>.</p>

                    <p style="font-size: 16px; color: #333;">Aquí están los detalles actualizados:</p>
                    <ul style="font-size: 16px; color: #333; line-height: 1.6;">
                      <li><strong>Fecha:</strong> ${date}</li>
                      <li><strong>Horario:</strong> ${startTime} - ${endTime}</li>
                      <li><strong>Reservado para:</strong> ${reservedFor}</li>
                    </ul>

                    <p style="font-size: 16px; color: #333;">Puedes revisar esta información en tu panel de usuario. Si no realizaste este cambio o tienes preguntas, por favor contáctanos.</p>

                    <p style="margin-top: 40px; font-size: 16px; color: #555;">
                      ¡Gracias por seguir eligiendo <strong>CanchApp</strong>!
                    </p>

                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 13px; color: #999;">Este es un correo automático. No respondas a este mensaje.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>

    `,
    });

    res.status(200).json({
      message: "Reserva editada correctamente.",
      data: reservation,
    });
  } catch (err) {
    console.error("Error editando reserva:", err);
    res.status(500).json({ message: "Error interno al editar la reserva." });
  }
};

export const cancelReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const reservation = await Reservation.findById(id).populate(
      "user",
      "email name lastName"
    );

    if (!reservation) {
      return res.status(404).json({ message: "Reserva no encontrada." });
    }

    if (reservation.status === "usada") {
      return res
        .status(400)
        .json({ message: "No puedes cancelar una reserva ya utilizada." });
    }

    if (reservation.status === "cancelada") {
      return res
        .status(400)
        .json({ message: "Esta reserva ya está cancelada." });
    }

    reservation.status = "cancelada";
    reservation.cancelledBy = req.user?.id as any;
    reservation.cancelReason = reason || "Cancelada por administración";

    await reservation.save();

    const emailTo = (reservation.user as any).email;

    await transporter.sendMail({
      from: '"CanchApp" <no-reply@canchapp.com>',
      to: emailTo,
      subject: "Tu reserva fue cancelada",
      html: `
        <div style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9f9f9;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding: 20px; background-color: #f9f9f9;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0"
                style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <tr>
                  <td align="left">
                    <h2 style="color: #dc2626;">Reserva cancelada</h2>
                    <p style="font-size: 16px; color: #333;">Hola ${
                      (reservation.user as any).name
                    },</p>
      
                    <p style="font-size: 16px; color: #333;">
                      Te informamos que tu reserva para el día <strong>${
                        reservation.date
                      }</strong> de 
                      <strong>${reservation.startTime}</strong> a <strong>${
        reservation.endTime
      }</strong> ha sido <strong style="color: #dc2626;">cancelada</strong>.
                    </p>
      
                    <p style="font-size: 16px; color: #333;">
                      <strong>Motivo de la cancelación:</strong><br />
                      <span style="color: #555;">${
                        reservation.cancelReason
                      }</span>
                    </p>
      
                    <p style="font-size: 16px; color: #333;">
                      Si tienes alguna duda o necesitas más información, no dudes en contactarnos.
                    </p>
      
                    <p style="margin-top: 40px; font-size: 16px; color: #555;">
                      Lamentamos cualquier inconveniente y agradecemos que seas parte de <strong>CanchApp</strong>.
                    </p>
      
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 13px; color: #999;">Este es un correo automático. No respondas a este mensaje.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>`,
    });

    res
      .status(200)
      .json({ message: "Reserva cancelada exitosamente.", data: reservation });
  } catch (err) {
    console.error("Error cancelando reserva:", err);
    res.status(500).json({ message: "Error interno al cancelar reserva." });
  }
};

export const reservationSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Santo_Domingo",
    });

    // Próximas reservas desde hoy en adelante
    const upcoming = await Reservation.find({
      user: userId,
      date: { $gte: today },
    })
      .sort({ date: 1, startTime: 1 })
      .limit(5)
      .populate("court", "courtName location type")
      .populate("user", "name lastName email")
      .lean();

    // Actividad reciente (reservas pasadas)
    const recent = await Reservation.find({
      user: userId,
      date: { $lt: today },
    })
      .sort({ date: -1, startTime: -1 })
      .limit(5)
      .populate("court", "courtName location type")
      .populate("user", "name lastName email")
      .lean();

    res.status(200).json({
      upcoming,
      recent,
    });
  } catch (error) {
    console.error("Error obteniendo resumen de reservas:", error);
    res.status(500).json({ message: "Error interno al obtener el resumen." });
  }
};
