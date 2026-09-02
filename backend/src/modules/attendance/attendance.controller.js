import prisma from "../../config/prisma.js";

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
  const { date } = req.body;

  try {
    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }
    if (!isOpen(classData)) {
      return res.status(400).json({ message: "Só é possível lançar presenças em turmas abertas" });
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

    res.status(201).json(session);
  } catch (error) {
    console.error("Erro ao criar sessão:", error);
    res.status(500).json({ message: "Erro ao criar sessão", error: error.message });
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
        createdAt: s.createdAt,
        totalStudents,
        present,
        absent,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao listar sessões:", error);
    res.status(500).json({ message: "Erro ao listar sessões", error: error.message });
  }
};

// Detalhe de uma sessão (alunos + presença), para marcar
export const getSession = async (req, res) => {
  const { classId, sessionId } = req.params;

  try {
    const session = await prisma.attendanceSession.findFirst({
      where: { id: sessionId, classId },
      include: {
        records: {
          include: {
            enrollment: {
              include: { student: { select: { id: true, name: true, email: true } } },
            },
          },
          orderBy: { enrollment: { joinedAt: "asc" } },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ message: "Sessão não encontrada" });
    }

    const students = session.records.map((r) => ({
      recordId: r.id,
      enrollmentId: r.enrollmentId,
      name: r.enrollment.student?.name || r.enrollment.manualName || "—",
      email: r.enrollment.student?.email || null,
      present: r.present,
    }));

    res.status(200).json({
      id: session.id,
      date: session.date,
      students,
    });
  } catch (error) {
    console.error("Erro ao buscar sessão:", error);
    res.status(500).json({ message: "Erro ao buscar sessão", error: error.message });
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

    const session = await prisma.attendanceSession.findFirst({
      where: { id: sessionId, classId },
    });
    if (!session) {
      return res.status(404).json({ message: "Sessão não encontrada" });
    }

    if (!Array.isArray(records)) {
      return res.status(400).json({ message: "Registros inválidos" });
    }

    await prisma.$transaction(
      records.map((r) =>
        prisma.attendanceRecord.updateMany({
          where: { sessionId, enrollmentId: r.enrollmentId },
          data: { present: r.present },
        })
      )
    );

    res.status(200).json({ message: "Presenças atualizadas" });
  } catch (error) {
    console.error("Erro ao atualizar presenças:", error);
    res.status(500).json({ message: "Erro ao atualizar presenças", error: error.message });
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

    const sessions = await prisma.attendanceSession.findMany({
      where: { classId },
      include: { records: { select: { present: true } } },
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

    res.status(200).json({
      className: classData.name,
      classCode: classData.code,
      status: classData.status,
      totalSessions: sessions.length,
      totalRecords,
      present,
      absent: totalRecords - present,
      perSession,
    });
  } catch (error) {
    console.error("Erro ao gerar resumo de presenças:", error);
    res.status(500).json({ message: "Erro ao gerar resumo de presenças", error: error.message });
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
      const percentage = agg.total > 0 ? Math.round((agg.present / agg.total) * 100) : 0;
      return {
        classId: classKey,
        className: sample.enrollment.class.name,
        classCode: sample.enrollment.class.code,
        present: agg.present,
        totalSessions: agg.total,
        percentage,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao buscar participação:", error);
    res.status(500).json({ message: "Erro ao buscar participação", error: error.message });
  }
};
