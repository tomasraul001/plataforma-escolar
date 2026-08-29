import express from "express";
import * as gradesController from "./grades.controller.js";
import * as planilhaController from "./planilha.controller.js";
import { auth, authorize } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.use(auth);

// Lançar nota individual
router.post("/", authorize("formador", "coordenador"), gradesController.createGrade);

// Lançar notas em lote (útil para planilha)
router.post("/bulk", authorize("formador", "coordenador"), gradesController.bulkCreateGrades);

// Pauta completa da turma (formador, coordenador, secretaria)
router.get("/pauta/:classId", authorize("formador", "coordenador", "secretaria"), gradesController.getGradebook);

// Listar notas (formador, coordenador, secretaria veem tudo; formando vê só suas)
router.get("/:classId", authorize("formador", "coordenador", "secretaria", "formando"), gradesController.listGrades);

// Atualizar nota
router.patch("/:id", authorize("formador", "coordenador"), gradesController.updateGrade);

// Planilha completa (alunos + notas + média)
router.get("/planilha/:classId", authorize("formador", "coordenador", "formando"), planilhaController.getPlanilha);

// Auto-save nota individual (focus out)
router.post("/planilha/:classId/auto-save", authorize("formador", "coordenador"), planilhaController.autoSaveGrade);

// Inicializar/obter template da planilha
router.post("/planilha/:classId/initialize", authorize("formador", "coordenador"), planilhaController.initializePlanilha);
router.get("/planilha/:classId/template", authorize("formador", "coordenador", "formando"), planilhaController.getPlanilhaTemplate);
router.patch("/planilha/:classId/template", authorize("formador", "coordenador"), planilhaController.updatePlanilhaTemplate);

export default router;