import express from "express";
import * as classesController from "./classes.controller.js";
import { auth, authorize } from "../../middleware/auth.middleware.js";
import { auditLog } from "../../middleware/auditLog.middleware.js";

const router = express.Router();

// Todas as rotas exigem autenticação
router.use(auth);

// Áreas de formação - DEVEM VIR ANTES DE /:id
router.post("/areas", authorize("coordenador"), auditLog("training_area.create"), classesController.createTrainingArea);
router.get("/areas", authorize("coordenador", "secretaria", "formador"), classesController.listTrainingAreas);
router.patch("/areas/:id", authorize("coordenador"), auditLog("training_area.update"), classesController.updateTrainingArea);
router.delete("/areas/:id", authorize("coordenador"), auditLog("training_area.delete"), classesController.deleteTrainingArea);

// Locais/Regiões - DEVEM VIR ANTES DE /:id
router.post("/regions", authorize("coordenador"), auditLog("region.create"), classesController.createRegion);
router.get("/regions", authorize("coordenador", "secretaria", "formador"), classesController.listRegions);
router.patch("/regions/:id", authorize("coordenador"), auditLog("region.update"), classesController.updateRegion);
router.delete("/regions/:id", authorize("coordenador"), auditLog("region.delete"), classesController.deleteRegion);

// Formador cria turma
router.post("/", authorize("formador", "coordenador"), auditLog("class.create"), classesController.createClass);

// Formador lista suas turmas
router.get("/minhas", authorize("formador", "coordenador"), classesController.listMyClasses);

// Coordenador/Secretaria lista todas
router.get("/todas", authorize("coordenador", "secretaria"), classesController.listAllClasses);

// Estatísticas (global ou por região) - ANTES de /:id
router.get("/stats", authorize("coordenador", "secretaria"), classesController.getClassStats);

// Buscar turma por ID
router.get("/:id", authorize("formador", "coordenador", "secretaria"), classesController.getClassById);

// Arquivar turma (secretaria/coordenador) - ANTES de /:id patch
router.post("/:id/archive", authorize("secretaria", "coordenador"), auditLog("class.archive"), classesController.archiveClass);

// Atualizar turma (rascunho -> aberta, etc)
router.patch("/:id", authorize("formador", "coordenador"), auditLog("class.update"), classesController.updateClass);

// Fechar turma
router.post("/:id/close", authorize("formador", "coordenador"), auditLog("class.close"), classesController.closeClass);

export default router;
