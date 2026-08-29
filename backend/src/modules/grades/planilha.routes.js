import express from "express";
import * as planilhaController from "./planilha.controller.js";
import { auth, authorize } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.use(auth);

// Planilha completa (alunos + notas + média)
router.get("/planilha/:classId", authorize("formador", "coordenador", "formando"), planilhaController.getPlanilha);

// Auto-save nota individual (focus out)
router.post("/planilha/:classId/auto-save", authorize("formador", "coordenador"), planilhaController.autoSaveGrade);

// Inicializar/obter template da planilha
router.post("/planilha/:classId/initialize", authorize("formador", "coordenador"), planilhaController.initializePlanilha);
router.get("/planilha/:classId/template", authorize("formador", "coordenador", "formando"), planilhaController.getPlanilhaTemplate);
router.patch("/planilha/:classId/template", authorize("formador", "coordenador"), planilhaController.updatePlanilhaTemplate);

export default router;