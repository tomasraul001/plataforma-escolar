import express from "express";
import * as usersController from "./users.controller.js";
import { auth, authorize } from "../../middleware/auth.middleware.js";

const userRouter = express.Router();

// A rota '/lista' exige que o usuário esteja autenticado
userRouter.get("/lista", auth, usersController.getAllUsers);
// Exclusão de usuários é exclusiva do coordenador
userRouter.delete("/delete/:id", auth, authorize("coordenador"), usersController.deleteUser);
// Perfil proprio
userRouter.patch("/perfil", auth, usersController.updateProfile);
userRouter.post("/trocar-senha", auth, usersController.changePassword);

export default userRouter;