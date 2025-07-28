import { Request, Response } from "express";
import User from "../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { transporter } from "../utils/mailer";

export const register = async (req: Request, res: Response) => {
  try {
    const { name, lastName, identificationNum, email, password, role } =
      req.body;

    if (!name || !lastName || !identificationNum || !email || !password) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios." });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ message: "El correo ya está registrado." });
    }

    const existingId = await User.findOne({ identificationNum });
    if (existingId) {
      return res
        .status(409)
        .json({ message: "Ese número de identificación ya está registrado." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const code = Math.floor(100000 + Math.random() * 900000).toString(); // Ej: '472918'
    const verificationExpires = new Date(Date.now() + 60 * 60 * 1000);

    const newUser = new User({
      name,
      lastName,
      identificationNum,
      email,
      password: hashedPassword,
      role: role || "customer",
      verificationCode: code,
      verificationExpires,
    });

    await newUser.save();

    const token = jwt.sign(
      {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1 * 60 * 60 * 1000,
      })
      .status(201)
      .json({
        message: "Usuario registrado con éxito.",
        user: {
          id: newUser._id,
          name: newUser.name,
          lastName: newUser.lastName,
          identificationNum: newUser.identificationNum,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
        },
      });

    await transporter
      .sendMail({
        from: '"CanchApp" <no-replay@canchapp.com>',
        to: newUser.email,
        subject: "Código de verificación de tu cuenta",
        html: `
        <div style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td align="left">
                    <h2 style="color: #1cb179;">¡Bienvenido a CanchApp!</h2>
                    <p style="font-size: 16px; color: #333;">Gracias por registrarte en nuestra plataforma. Estamos emocionados de tenerte como parte de nuestra comunidad.</p>
      
                    <p style="font-size: 16px; margin-top: 30px;">
                      <b>Tu código de confirmación es:</b>
                      <span style="color: #1cb179; font-size: 20px; font-weight: bold;">${code}</span>
                    </p>
      
                    <p style="font-size: 16px; color: #333;">
                      Inicia sesión con tus credenciales e ingresa el código en la aplicación para verificar tu cuenta y empezar a reservar tus canchas favoritas.
                    </p>
      
                    <p style="font-size: 14px; color: #dc2626; margin-top: 10px;">
                      Este código es válido por 1 hora desde la recepción de este correo.
                    </p>
      
                    <p style="margin-top: 40px; font-size: 15px; color: #555;">
                      ¡Gracias por unirte a <b>CanchApp</b>!
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
  } catch (err) {
    console.error("Error al registrar usuario:", err);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

dotenv.config();

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Correo y contraseña son requeridos." });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas." });
    }

    if (user.status === "suspend") {
      return res.status(403).json({ message: "Tu cuenta está suspendida." });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: "Credenciales inválidas." });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1 * 60 * 60 * 1000,
      })
      .status(200)
      .json({
        message: "Inicio de sesión exitoso",
        token,
        user: {
          id: user._id,
          name: user.name,
          lastName: user.lastName,
          identificationNum: user.identificationNum,
          email: user.email,
          role: user.role,
          status: user.status,
          isVerified: user.isVerified,
        },
      });
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Sesión expirada" });

  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });

    res.json({ user });
  } catch (err) {
    console.error("Error al obtener usuario:", err);
    res.status(500).json({ message: "Error al obtener el usuario" });
  }
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.status(200).json({ message: "Sesión cerrada" });
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ message: "Token y nueva contraseña requeridos." });
  }

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() }, // aún no expira
  });

  if (!user) {
    return res.status(400).json({ message: "Token inválido o expirado." });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.resetPasswordToken = "";
  user.resetPasswordExpires = undefined as any;

  await user.save();

  res.status(200).json({ message: "Contraseña actualizada exitosamente." });
};

export const verifyAccount = async (req: Request, res: Response) => {
  const { email, code } = req.body;

  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ message: "Usuario no encontrado." });
  if (user.isVerified)
    return res.status(400).json({ message: "La cuenta ya fue verificada." });

  if (user.verificationCode !== code || user.verificationExpires < new Date()) {
    return res.status(400).json({ message: "Código inválido o expirado." });
  }

  user.isVerified = true;
  user.verificationCode = null as any;
  user.verificationExpires = null as any;

  await user.save();

  res.json({ message: "Cuenta verificada exitosamente." });
};
