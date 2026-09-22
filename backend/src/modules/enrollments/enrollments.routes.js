import express from "express";
import * as enrollmentsController from "./enrollments.controller.js";
import { auth, authorize } from "../../middleware/auth.middleware.js";
import { auditLog } from "../../middleware/auditLog.middleware.js";

const router = express.Router();

router.use(auth);

// Formando entra na turma
router.post("/join", authorize("formando"), auditLog("enrollment.join"), enrollmentsController.joinClass);

// Formando lista suas turmas
router.get("/minhas", authorize("formando"), enrollmentsController.listMyClasses);

// Formador/Coordenador/Secretaria veem alunos da turma
router.get("/turma/:classId/alunos", authorize("formador", "coordenador", "secretaria"), enrollmentsController.getClassStudents);

// Formador/Coordenador adiciona aluno manual (sem conta)
router.post("/turma/:classId/alunos", authorize("formador", "coordenador"), enrollmentsController.addStudentToClass);

// Formador/Coordenador remove aluno
router.delete("/turma/:classId/alunos/:enrollmentId", authorize("formador", "coordenador"), auditLog("enrollment.remove"), enrollmentsController.removeStudent);

export default router;