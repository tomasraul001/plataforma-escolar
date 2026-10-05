import prisma from "../config/prisma.js";

// Notificações in-app.
//
// Decisão de produto: substituem o WebSocket (descartado). O sino do header
// consulta /notifications/unread-count a cada 60s, portanto uma notificação
// aparece no máximo um minuto depois de ter sido criada.
//
// Regra não negociável: `notifyUser` nunca deixa a falha propagar. Uma
// notificação falhada não pode fazer falhar o lançamento de uma nota ou o
// fecho de uma turma — mesmo padrão do auditLog.middleware.js, que também
// faz `.catch()` no write.

// Uma notificação sem userId não tem para quem aparecer. Silenciar em vez de
// lançar tornaria o bug invisível na origem; falhar aqui, sim, é o aviso.
const notifyUser = async (userId, { type, title, body, link = null }) => {
  if (!userId) return null;

  try {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        link,
      },
    });
  } catch (error) {
    console.error("Falha ao criar notificacao:", type, error?.message || error);
    return null;
  }
};

// Fan-out para vários destinatários. Cria uma a uma em vez de createMany para
// que um aluno sem conta ou já apagado não faça a operação inteira falhar.
const notifyUsers = async (userIds, payload) => {
  const unique = [...new Set(userIds.filter(Boolean))];
  return Promise.all(unique.map((userId) => notifyUser(userId, payload)));
};

// Formandos com conta ativa inscritos na turma. Alunos adicionados sem conta
// (manualName) não recebem: não há utilizador para notificar.
const notifyEnrollmentStudents = async (classId, payload) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { classId, status: "ACTIVE", studentId: { not: null } },
      select: { studentId: true },
    });
    return await notifyUsers(
      enrollments.map((e) => e.studentId),
      payload
    );
  } catch (error) {
    console.error("Falha ao notificar formandos da turma:", classId, error?.message || error);
    return [];
  }
};

// Uma notificação nova invalida as antigas equivalentes, para o utilizador não
// receber dez "a nota foi alterada" se o formador corrigiu o mesmo aluno cinco
// vezes seguidas.
const NOTIFY_REPLACEABLE = new Set(["grade_updated"]);

const notifyUserReplacing = async (userId, payload) => {
  if (NOTIFY_REPLACEABLE.has(payload.type)) {
    try {
      await prisma.notification.deleteMany({
        where: {
          userId,
          type: payload.type,
          link: payload.link ?? null,
          readAt: null,
        },
      });
    } catch (error) {
      console.error("Falha ao limpar notificacao anterior:", error?.message || error);
    }
  }
  return notifyUser(userId, payload);
};

export {
  notifyUser,
  notifyUsers,
  notifyEnrollmentStudents,
  notifyUserReplacing,
};