import express from "express";
import * as attendanceController from "./attendance.controller.js";
import { auth, authorize } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.use(auth);

// Formador/Coordenador: criar sessão e marcar presenças (turma OPEN)
router.post("/classes/:classId/sessions", authorize("formador", "coordenador"), attendanceController.createSession);
router.get("/classes/:classId/sessions", authorize("formador", "coordenador", "secretaria"), attendanceController.listSessions);
router.get("/classes/:classId/sessions/:sessionId", authorize("formador", "coordenador"), attendanceController.getSession);
router.patch("/classes/:classId/sessions/:sessionId", authorize("formador", "coordenador"), attendanceController.bulkUpdateRecords);

// Secretaria/Coordenador: resumo (contagem de presentes e faltosos)
router.get("/classes/:classId/summary", authorize("formador", "coordenador", "secretaria"), attendanceController.getSummary);

// Formando: sua % de participação
router.get("/minha", authorize("formando"), attendanceController.getMyAttendance);

export default router;
