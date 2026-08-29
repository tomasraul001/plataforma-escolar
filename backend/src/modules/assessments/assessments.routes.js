import express from "express";
import * as assessmentsController from "./assessments.controller.js";
import { auth, authorize } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.use(auth);

// Formador/Coordenador cria avaliação
router.post("/", authorize("formador", "coordenador"), assessmentsController.createAssessment);

// Listar avaliações (formador, coordenador, secretaria, formando)
router.get("/:classId", authorize("formador", "coordenador", "secretaria", "formando"), assessmentsController.listAssessments);

// Formador/Coordenador atualiza avaliação
router.patch("/:id", authorize("formador", "coordenador"), assessmentsController.updateAssessment);

// Formador/Coordenador exclui avaliação
router.delete("/:id", authorize("formador", "coordenador"), assessmentsController.deleteAssessment);

export default router;