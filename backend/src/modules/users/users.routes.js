import express from "express";
import * as usersController from "./users.controller.js";
import { auth, authorize } from "../../middleware/auth.middleware.js";

const userRouter = express.Router();

// A rota '/lista' exige que o usuário esteja autenticado
userRouter.get("/lista", auth, usersController.getAllUsers);
// Exclusão de usuários é exclusiva do coordenador
userRouter.delete("/delete/:id", auth, authorize("coordenador"), usersController.deleteUser);

export default userRouter;