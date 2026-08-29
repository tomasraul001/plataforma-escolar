import express from "express";
import * as classesController from "./classes.controller.js";
import { auth, authorize } from "../../middleware/auth.middleware.js";

const router = express.Router();

// Todas as rotas exigem autenticação
router.use(auth);

// Áreas de formação (Coordenador/Admin) - DEVEM VIR ANTES DE /:id
router.post("/areas", authorize("coordenador"), classesController.createTrainingArea);
router.get("/areas", authorize("coordenador", "secretaria", "formador"), classesController.listTrainingAreas);

// Formador cria turma
router.post("/", authorize("formador", "coordenador"), classesController.createClass);

// Formador lista suas turmas
router.get("/minhas", authorize("formador", "coordenador"), classesController.listMyClasses);

// Coordenador/Secretaria lista todas
router.get("/todas", authorize("coordenador", "secretaria"), classesController.listAllClasses);

// Buscar turma por ID
router.get("/:id", authorize("formador", "coordenador", "secretaria"), classesController.getClassById);

// Atualizar turma (rascunho -> aberta, etc)
router.patch("/:id", authorize("formador", "coordenador"), classesController.updateClass);

// Fechar turma
router.post("/:id/close", authorize("formador", "coordenador"), classesController.closeClass);

// Áreas de formação (Coordenador/Admin) - DEVEM VIR ANTES DE /:id
router.post("/areas", authorize("coordenador"), classesController.createTrainingArea);
router.get("/areas", authorize("coordenador", "secretaria", "formador"), classesController.listTrainingAreas);
router.patch("/areas/:id", authorize("coordenador"), classesController.updateTrainingArea);
router.delete("/areas/:id", authorize("coordenador"), classesController.deleteTrainingArea);

export default router;