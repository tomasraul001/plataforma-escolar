import prisma from "../../config/prisma.js";

const DEFAULT_LIMIT = 30;

// Lista as notificações do próprio utilizador. Nunca aceita um userId do
// corpo ou da query: o `where` é sempre preso ao req.user.id, senão bastava
// trocar o id no pedido para ler as notificações de outra conta (IDOR).
export const listNotifications = async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1),
      100
    );
    const onlyUnread = req.query.unread === "true";

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id, ...(onlyUnread ? { readAt: null } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.status(200).json(notifications);
  } catch (error) {
    console.error("Erro ao listar notificações:", error);
    res.status(500).json({ message: "Erro ao listar notificações" });
  }
};

// Endpoint leve para o badge do sino, polled a cada 60s. `count` sobre um índice
// parcial é muito mais barato que trazer a lista inteira só para contar.
export const getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, readAt: null },
    });
    res.status(200).json({ count });
  } catch (error) {
    console.error("Erro ao contar notificações:", error);
    res.status(500).json({ message: "Erro ao contar notificações" });
  }
};

// Marcar uma como lida. O `userId` no `where` é o que impede o IDOR: um
// utilizador não marca como lida a notificação de outro, recebe 404.
export const markAsRead = async (req, res) => {
  const { id } = req.params;

  try {
    const updated = await prisma.notification.updateMany({
      where: { id, userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });

    if (updated.count === 0) {
      return res.status(404).json({ message: "Notificação não encontrada" });
    }

    const count = await prisma.notification.count({
      where: { userId: req.user.id, readAt: null },
    });

    res.status(200).json({ message: "Notificação marcada como lida", count });
  } catch (error) {
    console.error("Erro ao marcar notificação como lida:", error);
    res.status(500).json({ message: "Erro ao marcar notificação como lida" });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const updated = await prisma.notification.updateMany({
      where: { userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });

    res.status(200).json({ message: "Notificações marcadas como lidas", count: updated.count });
  } catch (error) {
    console.error("Erro ao marcar notificações como lidas:", error);
    res.status(500).json({ message: "Erro ao marcar notificações como lidas" });
  }
};

// Limpa as notificações já lidas do próprio utilizador. Sem `readAt: null` no
// where, isto seria um botão de "apagar tudo" disfarçado.
export const clearRead = async (req, res) => {
  try {
    const deleted = await prisma.notification.deleteMany({
      where: { userId: req.user.id, readAt: { not: null } },
    });

    res.status(200).json({ message: "Notificações lidas removidas", count: deleted.count });
  } catch (error) {
    console.error("Erro ao limpar notificações:", error);
    res.status(500).json({ message: "Erro ao limpar notificações" });
  }
};