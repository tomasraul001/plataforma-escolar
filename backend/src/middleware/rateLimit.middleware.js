import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ message: "Muitas requisições. Tente novamente mais tarde." });
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ message: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
  },
});

// Limiter por CONTA (email), nao por IP: o authLimiter por IP nao trava
// spraying distribuido (N IPs, 1 password cada contra a mesma conta).
// Tradeoff: um atacante pode forcar o limite de login de uma conta por
// 15min (auto-recuperavel) — preferido a deixar o ataque distribuido
// passar. So montado no POST /login.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email;
    return typeof email === "string" && email.trim()
      ? `conta:${email.trim().toLowerCase()}`
      : "conta:sem-email";
  },
  handler: (_req, res) => {
    res.status(429).json({ message: "Muitas tentativas para esta conta. Aguarde alguns minutos." });
  },
});
