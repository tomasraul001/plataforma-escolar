import express from "express";
import * as usersController from "./users.controller.js";
import { auth } from "../../middleware/auth.middleware.js";

const userRouter = express.Router();

// A rota '/lista' exige que o usuário esteja autenticado
userRouter.get("/lista", auth, usersController.getAllUsers);
userRouter.delete("/delete/:id", auth, usersController.deleteUser);

export default userRouter;