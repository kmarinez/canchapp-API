import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config({path: "../.env"});

console.log("✅ SMTP_USER:", process.env.SMTP_USER);
console.log("✅ SMTP_PASS:", process.env.SMTP_PASS);

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Fallo conexión:", error);
  } else {
    console.log("✅ Conexión correcta, listo para enviar correos!");
  }
});