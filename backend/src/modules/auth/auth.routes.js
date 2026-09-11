import express from "express";
import * as authController from "./auth.controller.js";
import { authLimiter } from "../../middleware/rateLimit.middleware.js";

const authRouter = express.Router();

authRouter.post("/register", authLimiter, authController.register);
authRouter.post("/login", authLimiter, authController.login);
authRouter.post("/refresh", authLimiter, authController.refresh);
authRouter.post("/logout", authController.logout);

export default authRouter;
