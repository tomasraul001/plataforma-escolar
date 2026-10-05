import { Router } from "express";
import { auth } from "../../middleware/auth.middleware.js";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  clearRead,
} from "./notifications.controller.js";

// Todas as rotas são do próprio utilizador autenticado. Não há `authorize()` por
// role: qualquer papel lê as suas próprias notificações, o isolamento é por
// userId e está garantido no controller.
const router = Router();

router.get("/", auth, listNotifications);
router.get("/unread-count", auth, getUnreadCount);
router.patch("/read-all", auth, markAllAsRead);
router.delete("/read", auth, clearRead);
router.patch("/:id/read", auth, markAsRead);

export default router;