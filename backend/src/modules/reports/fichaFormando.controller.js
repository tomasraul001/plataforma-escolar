import prisma from "../../config/prisma.js";
import { calculateMediaByAssessments } from "../grades/assessmentWeights.js";

export const buscarFormandos = async (req, res) => {
  const { q } = req.query;

  try {
    const where = {
      role: "formando",
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    };

    if (req.user.role === "formador") {
      const myClassIds = (
        await prisma.class.findMany({
          where: { trainerId: req.user.id },
          select: { id: true },
        })
      ).map((c) => c.id);

      const enrolledStudentIds = (
        await prisma.enrollment.findMany({
          where: { classId: { in: myClassIds }, status: "ACTIVE", studentId: { not: null } },
          select: { studentId: true },
        })
      ).map((e) => e.studentId);

      where.id = { in: enrolledStudentIds };
    }

    const formandos = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true, sexo: true },
      orderBy: { name: "asc" },
    });

    res.status(200).json(formandos);
  } catch (error) {
    console.error("Erro ao buscar formandos:", error);
    res.status(500).json({ message: "Erro ao buscar formandos" });
  }
};

export const getFicha = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, sexo: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ message: "Formando não encontrado" });
    }

    if (req.user.role === "formador") {
      const hasAccess = await prisma.enrollment.findFirst({
        where: {
          studentId: userId,
          class: { trainerId: req.user.id },
          status: "ACTIVE",
        },
      });
      if (!hasAccess) {
        return res.status(403).json({ message: "Acesso negado a este formando" });
      }
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: userId },
      include: {
        class: {
          include: {
            trainingArea: true,
            assessments: { orderBy: { createdAt: "asc" } },
          },
        },
        grades: { include: { assessment: true } },
        attendanceRecords: { include: { session: true } },
      },
      orderBy: { joinedAt: "desc" },
    });

    const turmas = enrollments.map((enrollment) => {
      const gradesMap = {};
      enrollment.grades.forEach((g) => {
        gradesMap[g.assessmentId] = g.value;
      });

      const totalSessions = enrollment.attendanceRecords.length;
      const presentCount = enrollment.attendanceRecords.filter((r) => r.present).length;
      const presenca = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : null;

      const notas = enrollment.class.assessments.map((a) => ({
        assessmentId: a.id,
        assessmentName: a.name,
        value: gradesMap[a.id] ?? null,
      }));

      const media = calculateMediaByAssessments(gradesMap, enrollment.class.assessments);

      let estado;
      if (enrollment.class.status === "CLOSED" || enrollment.class.status === "ARCHIVED") {
        if (media === null) {
          estado = "SEM AVALIAÇÕES";
        } else if (media >= 10) {
          estado = "APROVADO";
        } else {
          estado = "REPROVADO";
        }
      } else {
        estado = "EM CURSO";
      }

      return {
        classId: enrollment.class.id,
        className: enrollment.class.name,
        classCode: enrollment.class.code,
        classStatus: enrollment.class.status,
        trainingArea: enrollment.class.trainingArea?.name || "—",
        presenca,
        notas,
        media,
        estado,
      };
    });

    res.status(200).json({ user, turmas });
  } catch (error) {
    console.error("Erro ao buscar ficha do formando:", error);
    res.status(500).json({ message: "Erro ao buscar ficha do formando" });
  }
};
