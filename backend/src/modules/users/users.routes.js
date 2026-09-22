import express from "express";
import * as usersController from "./users.controller.js";
import { auth, authorize } from "../../middleware/auth.middleware.js";
import { auditLog } from "../../middleware/auditLog.middleware.js";

const userRouter = express.Router();

// A rota '/lista' exige que o usuário esteja autenticado
userRouter.get("/lista", auth, usersController.getAllUsers);
// Exclusão de usuários é exclusiva do coordenador
userRouter.delete("/delete/:id", auth, authorize("coordenador"), auditLog("user.delete"), usersController.deleteUser);
// Perfil proprio
userRouter.patch("/perfil", auth, auditLog("user.update_profile"), usersController.updateProfile);
userRouter.post("/trocar-senha", auth, auditLog("user.change_password"), usersController.changePassword);

export default userRouter;