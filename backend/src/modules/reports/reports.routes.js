import express from "express";
import * as reportsController from "./reports.controller.js";
import { auth, authorize } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.use(auth);

// PDF da Pauta - Formador, Coordenador, Secretaria
router.get("/pauta/:classId/pdf", authorize("formador", "coordenador", "secretaria"), reportsController.generatePautaPDF);

// Certificado (futuro)
router.get("/certificado/:classId/:studentId/pdf", authorize("coordenador", "secretaria"), reportsController.generateCertificadoPDF);

export default router;