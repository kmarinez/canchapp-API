import rateLimit from "express-rate-limit";

// Limita a 50 solicitudes por IP cada 15 minutos
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 50, // límite de solicitudes por IP
    message: {
        status: 429,
        message: "Demasiadas solicitudes desde esta IP. Intenta nuevamente más tarde.",
    },
    standardHeaders: true, // incluye headers RateLimit
    legacyHeaders: false,  // desactiva `X-RateLimit-*` headers antiguos
});

export const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutos
    max: 5, // Máximo 5 intentos de login
    message: {
        status: 429,
        message: "Demasiados intentos de login. Intenta nuevamente en unos minutos."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

//Límite para crear reservas (previene spam de reservas)
export const critalLimitier = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 3, // 3 reservas cada 5 minutos
    message: {
        status: 429,
        message: "Demasiadas reservas seguidas. Intenta más tarde."
    },
    standardHeaders: true,
    legacyHeaders: false,
});