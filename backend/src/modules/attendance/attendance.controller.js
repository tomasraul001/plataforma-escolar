import prisma from "../../config/prisma.js";
import { attendanceStatus, attendancePercentage } from "../../utils/attendance.js";
import { notifyUser } from "../../utils/notifications.js";

const normalizeDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const isOpen = (cls) => cls && cls.status === "OPEN";

const getActiveEnrollments = async (classId) => {
  return prisma.enrollment.findMany({
    where: { classId, status: "ACTIVE" },
    include: { student: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });
};

// Criar sessão de presença (formador/coordenador, apenas turma OPEN)
export const createSession = async (req, res) => {
  const { classId } = req.params;
  const { date, theme } = req.body;

  if (!theme || !theme.trim()) {
    return res.status(400).json({ message: "O tema da aula é obrigatório" });
  }

  try {
    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }
    if (!isOpen(classData)) {
      return res.status(400).json({ message: "Só é possível lançar presenças em turmas abertas" });
    }

    if (classData.trainerId !== req.user.id && req.user.role !== "coordenador") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const sessionDate = normalizeDate(date || new Date());

    const existing = await prisma.attendanceSession.findUnique({
      where: { classId_date: { classId, date: sessionDate } },
    });
    if (existing) {
      return res.status(400).json({ message: "Já existe uma sessão nesta data" });
    }

    const session = await prisma.$transaction(async (tx) => {
      const created = await tx.attendanceSession.create({
        data: {
          classId,
          date: sessionDate,
          theme: theme.trim(),
        },
      });

      const enrollments = await tx.enrollment.findMany({
        where: { classId, status: "ACTIVE" },
        select: { id: true },
      });

      if (enrollments.length > 0) {
        await tx.attendanceRecord.createMany({
          data: enrollments.map((e) => ({
            sessionId: created.id,
            enrollmentId: e.id,
            present: true,
          })),
        });
      }

      return created;
    });

    // Quem cria a sessao ja esta a ve-la. O aviso e para o formador da turma,
    // que e quem fecha o ciclo: se foi o coordenador a criar, ele precisa de
    // saber que ha registos por fazer.
    notifyUser(classData.trainerId, {
      type: "attendance_session_created",
      title: "Sessão de presença criada",
      body: `Sessão de ${sessionDate.toLocaleDateString("pt-BR")} registada na turma ${classData.name}.`,
      link: `/formador/turma/${classId}/presencas`,
    });

    // Secretaria e coordenador seguem as turmas; avisar também quem não é o
    // formador evita que a sessão fique por registar. Um por papel, sem
    // duplicar se o coordenador for o próprio formador.
    for (const role of ["secretaria", "coordenador"]) {
      const staff = await prisma.user.findMany({ where: { role }, select: { id: true } });
      for (const { id } of staff) {
        if (id === classData.trainerId || id === req.user.id) continue;
        notifyUser(id, {
          type: "attendance_session_created",
          title: "Sessão de presença criada",
          body: `Sessão de ${sessionDate.toLocaleDateString("pt-BR")} registada na turma ${classData.name}.`,
          link: `/secretaria/turma/${classId}/presencas`,
        });
      }
    }

    res.status(201).json(session);
  } catch (error) {
    console.error("Erro ao criar sessão:", error);
    res.status(500).json({ message: "Erro ao criar sessão" });
  }
};

// Listar sessões da turma (formador, coordenador, secretaria)
export const listSessions = async (req, res) => {
  const { classId } = req.params;

  try {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
      },
    });
    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }

    if (classData.trainerId !== req.user.id && req.user.role !== "coordenador" && req.user.role !== "secretaria") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const sessions = await prisma.attendanceSession.findMany({
      where: { classId },
      include: {
        records: { select: { present: true } },
      },
      orderBy: { date: "desc" },
    });

    const totalStudents = classData._count.enrollments;

    const result = sessions.map((s) => {
      const present = s.records.filter((r) => r.present).length;
      const absent = s.records.filter((r) => !r.present).length;
      return {
        id: s.id,
        date: s.date,
        theme: s.theme,
        createdAt: s.createdAt,
        totalStudents,
        present,
        absent,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao listar sessões:", error);
    res.status(500).json({ message: "Erro ao listar sessões" });
  }
};

// Detalhe de uma sessão (alunos + presença), para marcar
export const getSession = async (req, res) => {
  const { classId, sessionId } = req.params;

  try {
    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }

    if (classData.trainerId !== req.user.id && req.user.role !== "coordenador") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const session = await prisma.attendanceSession.findFirst({
      where: { id: sessionId, classId },
      include: {
        records: true,
      },
    });

    if (!session) {
      return res.status(404).json({ message: "Sessão não encontrada" });
    }

    const allEnrollments = await prisma.enrollment.findMany({
      where: { classId, status: "ACTIVE" },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { joinedAt: "asc" },
    });

    const recordsMap = new Map(session.records.map((r) => [r.enrollmentId, r]));

    const students = allEnrollments.map((e) => {
      const record = recordsMap.get(e.id);
      return {
        recordId: record?.id || null,
        enrollmentId: e.id,
        name: e.student?.name || e.manualName || "—",
        email: e.student?.email || null,
        present: record?.present ?? true,
      };
    });

    res.status(200).json({
      id: session.id,
      date: session.date,
      theme: session.theme,
      students,
    });
  } catch (error) {
    console.error("Erro ao buscar sessão:", error);
    res.status(500).json({ message: "Erro ao buscar sessão" });
  }
};

// Marcar presenças em lote numa sessão (formador/coordenador, apenas turma OPEN)
export const bulkUpdateRecords = async (req, res) => {
  const { classId, sessionId } = req.params;
  const { records } = req.body; // [{enrollmentId, present}]

  try {
    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }
    if (!isOpen(classData)) {
      return res.status(400).json({ message: "Só é possível lançar presenças em turmas abertas" });
    }

    if (classData.trainerId !== req.user.id && req.user.role !== "coordenador") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const session = await prisma.attendanceSession.findFirst({
      where: { id: sessionId, classId },
    });
    if (!session) {
      return res.status(404).json({ message: "Sessão não encontrada" });
    }

    if (!Array.isArray(records)) {
      return res.status(400).json({ message: "Registros inválidos" });
    }

    // IDOR: garantir que todas as inscrições enviadas pertencem a esta turma.
    // Sem esta validação um formador criava presenças para alunos de outra turma.
    const enrollmentIds = [...new Set(records.map((r) => r.enrollmentId))];
    if (enrollmentIds.some((id) => typeof id !== "string" || !id)) {
      return res.status(400).json({ message: "Inscrição inválida" });
    }

    const validEnrollments = await prisma.enrollment.findMany({
      where: { id: { in: enrollmentIds }, classId, status: "ACTIVE" },
      select: { id: true },
    });

    const validIds = new Set(validEnrollments.map((e) => e.id));
    const invalidIds = enrollmentIds.filter((id) => !validIds.has(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        message: "Inscrição não pertence a esta turma",
      });
    }

    await prisma.$transaction(async (tx) => {
      const existingRecords = await tx.attendanceRecord.findMany({
        where: { sessionId },
        select: { enrollmentId: true },
      });
      const existingSet = new Set(existingRecords.map((r) => r.enrollmentId));

      const toUpdate = records.filter((r) => existingSet.has(r.enrollmentId));
      const toCreate = records.filter((r) => !existingSet.has(r.enrollmentId));

      // `tx` é o cliente transacional do Prisma e NÃO tem $transaction: uma
      // transação não se aninha noutra. As chamadas correm em paralelo dentro
      // da transação que já está aberta, o que dá o mesmo efeito atómico e
      // evita o "tx.$transaction is not a function" que rebentava o PATCH de
      // presenças em produção. Os testes passavam porque o stub de $transaction
      // é o mesmo objeto nos dois níveis.
      if (toUpdate.length > 0) {
        await Promise.all(
          toUpdate.map((r) =>
            tx.attendanceRecord.updateMany({
              where: { sessionId, enrollmentId: r.enrollmentId },
              data: { present: r.present },
            })
          )
        );
      }

      if (toCreate.length > 0) {
        await tx.attendanceRecord.createMany({
          data: toCreate.map((r) => ({
            sessionId,
            enrollmentId: r.enrollmentId,
            present: r.present,
          })),
        });
      }
    });

    res.status(200).json({ message: "Presenças atualizadas" });
  } catch (error) {
    console.error("Erro ao atualizar presenças:", error);
    res.status(500).json({ message: "Erro ao atualizar presenças" });
  }
};

// Resumo geral para secretaria/coordenador (contagem de presentes e faltosos)
export const getSummary = async (req, res) => {
  const { classId } = req.params;

  try {
    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }

    if (classData.trainerId !== req.user.id && req.user.role !== "coordenador" && req.user.role !== "secretaria") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    // enrollmentId tem de vir no select: e com ele que se agrupa a frequência por
    // aluno. Sem este campo o perStudent sai todo a awaitingSessions e o resumo
    // mostra 0% a quem esteve presente em todas as sessões.
    const sessions = await prisma.attendanceSession.findMany({
      where: { classId },
      include: { records: { select: { enrollmentId: true, present: true } } },
      orderBy: { date: "asc" },
    });

    const perSession = sessions.map((s) => {
      const present = s.records.filter((r) => r.present).length;
      return {
        id: s.id,
        date: s.date,
        present,
        absent: s.records.length - present,
      };
    });

    const totalRecords = sessions.reduce((acc, s) => acc + s.records.length, 0);
    const present = sessions.reduce((acc, s) => acc + s.records.filter((r) => r.present).length, 0);

    // Frequência por aluno. O denominador é o número de sessões da turma, não
    // o número de registos do aluno: um aluno que entrou a meio do curso só tem
    // registos nas sessões a que assistiu, e `present / records.length` dava
    // 100% falso. `expectedSessions` conta só as sessões em que o aluno já
    // estava inscrito, para o número ter significado desde a primeira.
    const activeEnrollments = await prisma.enrollment.findMany({
      where: { classId, status: "ACTIVE" },
      include: { student: { select: { id: true, name: true } } },
      orderBy: { joinedAt: "asc" },
    });

    const sessionIdsByEnrollment = new Map();
    for (const session of sessions) {
      for (const record of session.records) {
        if (!sessionIdsByEnrollment.has(record.enrollmentId)) {
          sessionIdsByEnrollment.set(record.enrollmentId, new Set());
        }
        sessionIdsByEnrollment.get(record.enrollmentId).add(session.id);
      }
    }

    const perStudent = activeEnrollments.map((enrollment) => {
      const seenSessions = sessionIdsByEnrollment.get(enrollment.id) || new Set();
      const attended = Array.from(seenSessions).reduce((acc, sessionId) => {
        const session = sessions.find((s) => s.id === sessionId);
        const record = session?.records.find((r) => r.enrollmentId === enrollment.id);
        return acc + (record?.present ? 1 : 0);
      }, 0);

      const expectedSessions = seenSessions.size;
      const percentage = attendancePercentage(attended, expectedSessions, expectedSessions);

      return {
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        name: enrollment.student?.name || enrollment.manualName || "—",
        present: attended,
        totalSessions: expectedSessions,
        percentage,
        status: attendanceStatus(percentage),
        // Aluno inscrito depois da primeira sessão: ainda não tem histórico
        // suficiente para ser julgado.
        awaitingSessions: expectedSessions === 0,
      };
    });

    const belowMinimum = perStudent.filter(
      (s) => !s.awaitingSessions && s.status !== "ok"
    ).length;

    res.status(200).json({
      className: classData.name,
      classCode: classData.code,
      status: classData.status,
      totalSessions: sessions.length,
      totalRecords,
      present,
      absent: totalRecords - present,
      perSession,
      perStudent,
      belowMinimum,
    });
  } catch (error) {
    console.error("Erro ao gerar resumo de presenças:", error);
    res.status(500).json({ message: "Erro ao gerar resumo de presenças" });
  }
};

// % de participação do formando (formando)
export const getMyAttendance = async (req, res) => {
  const userId = req.user.id;
  const { classId } = req.query;

  try {
    const where = {
      enrollment: { studentId: userId },
    };
    if (classId) {
      where.enrollment = { studentId: userId, classId };
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        enrollment: {
          include: { class: { select: { id: true, name: true, code: true } } },
        },
      },
      orderBy: { session: { date: "asc" } },
    });

    // Para o próprio formando, presente/total de registos é a mesma coisa: ele
    // não tem registos das sessões em que ainda não estava inscrito, e não faz
    // sentido mostrar-lhe 100% por causa disso. O status vem do backend para o
    // frontend não repita o limiar.
    const byClass = new Map();
    records.forEach((r) => {
      const classIdKey = r.enrollment.class.id;
      const key = `${classIdKey}`;
      const agg = byClass.get(key) || { present: 0, total: 0 };
      agg.present += r.present ? 1 : 0;
      agg.total += 1;
      byClass.set(key, agg);
    });

    const result = Array.from(byClass.entries()).map(([classKey, agg]) => {
      const sample = records.find((r) => r.enrollment.class.id === classKey);
      const percentage = attendancePercentage(agg.present, agg.total, agg.total);
      return {
        classId: classKey,
        className: sample.enrollment.class.name,
        classCode: sample.enrollment.class.code,
        present: agg.present,
        totalSessions: agg.total,
        percentage,
        status: attendanceStatus(percentage),
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao buscar participação:", error);
    res.status(500).json({ message: "Erro ao buscar participação" });
  }
};
