import express from "express";
import * as authController from "./auth.controller.js";

const authRouter = express.Router();

// Definimos os endpoints de POST para segurança
authRouter.post("/register", authController.register);
authRouter.post("/login", authController.login);

export default authRouter;