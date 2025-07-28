import { Request, Response } from "express";
import User from "../models/User";
import crypto from "crypto";
import Reservation from "../models/Reservation";
import { transporter } from "../utils/mailer";
import dotenv from "dotenv";

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    res.status(200).json({
      message: "Usuario actualizado.",
      data: {
        id: updated._id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        status: updated.status,
      },
    });
  } catch (err) {
    console.error("Error al actualizar usuario:", err);
    res.status(500).json({ message: "Error interno al actualizar usuario." });
  }
};

export const listUser = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;

    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });
    const staffUsers = await User.countDocuments({ role: "staff" });

    const users = await User.find()
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const result = await Promise.all(
      users.map(async (user) => {
        const count = await Reservation.countDocuments({ user: user._id });
        return {
          ...user,
          totalBookings: count,
        };
      })
    );

    res.status(200).json({
      page,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers: totalUsers,
      activeUsers: activeUsers,
      staffUsers: staffUsers,
      data: result,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json("Error listando usuarios");
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Correo requerido." });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "Usuario no encontrado." });

  const token = crypto.randomBytes(32).toString("hex");
  const expiration = Date.now() + 1000 * 60 * 60; // 1 hora

  user.resetPasswordToken = token;
  user.resetPasswordExpires = new Date(expiration);
  await user.save();

  const resetURL = `/clave-nueva?token=${token}`;

  dotenv.config()
  
  await transporter
    .sendMail({
      from: '"CanchApp" <no-replay@canchapp.com>',
      to: email,
      subject: "Código de verificación de tu cuenta",
      html: `
    <div style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td align="left">
              <h2 style="color: #1cb179;">Restablecimiento de Contraseña</h2>
              <p style="font-size: 16px; color: #333;">Hemos recibido una solicitud para restablecer tu contraseña en CanchApp.</p>
              <p style="font-size: 16px; color: #333;">
                Para establecer una nueva contraseña, haz clic en el siguiente enlace:
              </p>
              <p style="margin: 20px 0;">
                <a href="${process.env.CANCHAPP_CLIENT}/clave-nueva?token=${token}"
                   style="display: inline-block; padding: 12px 20px; background-color: #1cb179; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">
                  Cambiar contraseña
                </a>
              </p>
              <p style="font-size: 14px; color: #dc2626; margin-top: 10px;">
                Este enlace es válido por 1 hora desde la recepción de este correo. Si no realizaste esta solicitud, puedes ignorar este mensaje.
              </p>
              <p style="margin-top: 40px; font-size: 15px; color: #555;">
                El equipo de <b>CanchApp</b>
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
    })
    .then(() => {
      console.log("Correo enviado de forma exitosa");
    })
    .catch((err) => {
      console.log("Error al enviar correos", err);
    });

  // Aquí enviarías el email real
  console.info(`
      Enlace de recuperación: ${resetURL}
      Usuario: ${user.email}
    `);

  res
    .status(200)
    .json({ message: "Correo de recuperación enviado si el usuario existe." });
};

export const resendVerificationCode = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    console.log(email);
    if (!email) {
      return res.status(400).json({ message: "El correo es requerido." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "La cuenta ya está verificada." });
    }

    // Generar nuevo código
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    user.verificationCode = code;
    user.verificationExpires = expires;
    await user.save();

    // transporter.sendMail({
    //     from: '"CanchApp" <no-replay@canchapp.com>',
    //     to: newUser.email,
    //     subject: "Código de verificación de tu cuenta",
    //     html: `
    //     <div style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    //     <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    //       <tr>
    //         <td align="center">
    //           <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    //             <tr>
    //               <td align="left">
    //                 <h2 style="color: #1cb179;">Verifica tu correo electrónico</h2>
    //                 <p style="font-size: 16px; color: #333;">Gracias por registrarte en nuestra plataforma. Estamos emocionados de tenerte como parte de nuestra comunidad.</p>

    //                 <p style="font-size: 16px; margin-top: 30px;">
    //                   <b>Tu código de confirmación es:</b>
    //                   <span style="color: #1cb179; font-size: 20px; font-weight: bold;">${code}</span>
    //                 </p>

    //                 <p style="font-size: 16px; color: #333;">
    //                   Inicia sesión con tus credenciales e ingresa el código en la aplicación para verificar tu cuenta y empezar a reservar tus canchas favoritas.
    //                 </p>

    //                 <p style="font-size: 14px; color: #dc2626; margin-top: 10px;">
    //                   Este código es válido por 1 hora desde la recepción de este correo.
    //                 </p>

    //                 <p style="margin-top: 40px; font-size: 15px; color: #555;">
    //                   ¡Gracias por unirte a <b>CanchApp</b>!
    //                 </p>

    //                 <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">

    //                 <p style="font-size: 13px; color: #999;">Este es un correo automático. No respondas a este mensaje.</p>
    //               </td>
    //             </tr>
    //           </table>
    //         </td>
    //       </tr>
    //     </table>
    //   </div>
    //   `,
    // }).then(() => {
    //     console.log("Correo enviado de forma exitosa");
    // }).catch((err) => {
    //     console.log("Error al enviar correos", err);
    // });

    return res.status(200).json({ message: "Código reenviado exitosamente." });
  } catch (err) {
    console.error("Error al reenviar código:", err);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};
