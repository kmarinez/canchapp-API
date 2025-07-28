import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import courtRoutes from './routes/courtRoutes';
import userRoutes from './routes/userRoutes';
import reservationRoutes from './routes/reservationRoutes';
import { apiLimiter, critalLimitier, loginLimiter } from './middlewares/rateLimiter';

dotenv.config();

const app = express();

app.use(cors({
    origin: `${process.env.CANCHAPP_CLIENT}`,
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

//app.use("/api", apiLimiter);
//app.use("/api/auth", loginLimiter);
//app.use("/api/reservations", critalLimitier);

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/courts", courtRoutes);
app.use("/api/user", userRoutes);
app.use("/api/reservations", reservationRoutes);


app.get("/", (_req, res) => {
    res.send("API CanchApp funcionando");
});

export default app;
