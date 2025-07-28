import nodemailer from "nodemailer";
import path from "path";
import dotenv from "dotenv";

dotenv.config({
    path: path.resolve(__dirname, '../../.env'),
});

export const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});