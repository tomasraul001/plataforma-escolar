import express from 'express';
import cors from "cors";
import helmet from "helmet";
import "dotenv/config";

import { validateEnv, trustProxySetting } from './config/env.js';
import { globalLimiter } from './middleware/rateLimit.middleware.js';
import authRouter from './modules/auth/auth.routes.js';
import userRouter from './modules/users/users.routes.js';
import classesRouter from './modules/classes/classes.routes.js';
import enrollmentsRouter from './modules/enrollments/enrollments.routes.js';
import assessmentsRouter from './modules/assessments/assessments.routes.js';
import gradesRouter from './modules/grades/grades.routes.js';
import reportsRouter from './modules/reports/reports.routes.js';
import attendanceRouter from './modules/attendance/attendance.routes.js';
import notificationsRouter from './modules/notifications/notifications.routes.js';

const app = express();

validateEnv();

// TRUST_PROXY env-gated: confiar no X-Forwarded-For so atras de proxy
// (Railway ou config explicita) — num deploy direto, confiar permitia
// falsificar o IP e contornar o rate limit. Ver config/env.js.
const trustProxy = trustProxySetting();
app.set("trust proxy", trustProxy);
console.log(`[env] trust proxy = ${JSON.stringify(trustProxy)}`);

app.use(helmet());

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
  "https://centro-apec.vercel.app",
  process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null,
].filter(Boolean);

app.use(express.json({ limit: "10kb" }));
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(globalLimiter);


app.get("/", (req, res) => res.json({ status: "ok" }));

app.use('/auth', authRouter);
app.use('/users', userRouter);
app.use('/classes', classesRouter);
app.use('/enrollments', enrollmentsRouter);
app.use('/assessments', assessmentsRouter);
app.use('/grades', gradesRouter);
app.use('/reports', reportsRouter);
app.use('/attendance', attendanceRouter);
app.use('/notifications', notificationsRouter);

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

server.on('error', (error) => {
  console.error('Server error:', error);
});