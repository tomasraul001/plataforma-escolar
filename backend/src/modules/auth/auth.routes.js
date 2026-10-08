import express from "express";
import * as authController from "./auth.controller.js";
import { authLimiter, loginLimiter } from "../../middleware/rateLimit.middleware.js";

const authRouter = express.Router();

authRouter.post("/register", authLimiter, authController.register);
authRouter.post("/login", authLimiter, loginLimiter, authController.login);
authRouter.post("/refresh", authLimiter, authController.refresh);
authRouter.post("/logout", authLimiter, authController.logout);

export default authRouter;
