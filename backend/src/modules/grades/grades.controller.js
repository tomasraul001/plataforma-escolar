import prisma from "../../config/prisma.js";

export const createGrade = async (req, res) => {
  const { assessmentId, enrollmentId, value } = req.body;

  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { class: true },
    });

    if (!assessment) {
      return res.status(404).json({ message: "Avaliação não encontrada" });
    }

    if (assessment.class.trainerId !== req.user.id && req.user.role !== "coordenador") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    if (assessment.class.status === "CLOSED") {
      return res.status(400).json({ message: "Não é possível lançar notas em turma fechada" });
    }

    const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) {
      return res.status(404).json({ message: "Inscrição não encontrada" });
    }

    if (enrollment.classId !== assessment.classId) {
      return res.status(400).json({ message: "Inscrição não pertence a esta turma" });
    }

    const existingGrade = await prisma.grade.findFirst({
      where: { assessmentId, enrollmentId },
    });

    // Arredondamento aritmético (0.5 vai para cima)
    const roundedValue = Math.round(Number(value));

    let grade;
    if (existingGrade) {
      grade = await prisma.grade.update({
        where: { id: existingGrade.id },
        data: {
          value: roundedValue,
          updatedById: req.user.id,
        },
      });
    } else {
      grade = await prisma.grade.create({
        data: {
          value: roundedValue,
          assessmentId,
          enrollmentId,
          updatedById: req.user.id,
        },
      });
    }

    res.status(201).json({ message: "Nota lançada com sucesso", grade });
  } catch (error) {
    console.error("Erro ao lançar nota:", error);
    res.status(500).json({ message: "Erro ao lançar nota", error: error.message });
  }
};

export const bulkCreateGrades = async (req, res) => {
  const { assessmentId, grades } = req.body; // grades = [{ enrollmentId, value }, ...]

  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { class: true },
    });

    if (!assessment) {
      return res.status(404).json({ message: "Avaliação não encontrada" });
    }

    if (assessment.class.trainerId !== req.user.id && req.user.role !== "coordenador") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    if (assessment.class.status === "CLOSED") {
      return res.status(400).json({ message: "Não é possível lançar notas em turma fechada" });
    }

    const results = await Promise.all(
      grades.map(async ({ enrollmentId, value }) => {
        // Arredondamento aritmético (0.5 vai para cima)
        const roundedValue = Math.round(Number(value));

        const existingGrade = await prisma.grade.findFirst({
          where: { assessmentId, enrollmentId },
        });

        if (existingGrade) {
          return prisma.grade.update({
            where: { id: existingGrade.id },
            data: { value: roundedValue, updatedById: req.user.id },
          });
        } else {
          return prisma.grade.create({
            data: { value: roundedValue, assessmentId, enrollmentId, updatedById: req.user.id },
          });
        }
      })
    );

    res.status(201).json({ message: "Notas lançadas com sucesso", count: results.length });
  } catch (error) {
    console.error("Erro ao lançar notas em lote:", error);
    res.status(500).json({ message: "Erro ao lançar notas", error: error.message });
  }
};

export const listGrades = async (req, res) => {
  const { classId } = req.params;

  try {
    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }

    const canViewAll = ["formador", "coordenador", "secretaria"].includes(req.user.role);

    let where = {
      assessment: { classId },
    };

    if (!canViewAll && req.user.role === "formando") {
      // Formando só vê suas próprias notas
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId: req.user.id, classId, status: "ACTIVE" },
      });
      if (!enrollment) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      where.enrollmentId = enrollment.id;
    }

    const grades = await prisma.grade.findMany({
      where,
      include: {
        assessment: true,
        enrollment: {
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
        },
        updatedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ assessment: { createdAt: "asc" } }, { enrollment: { student: { name: "asc" } } }],
    });

    res.status(200).json(grades);
  } catch (error) {
    console.error("Erro ao listar notas:", error);
    res.status(500).json({ message: "Erro ao listar notas", error: error.message });
  }
};

export const getGradebook = async (req, res) => {
  const { classId } = req.params;

  try {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        assessments: { orderBy: { createdAt: "asc" } },
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            student: { select: { id: true, name: true, email: true } },
            grades: {
              include: { assessment: true },
            },
          },
        },
      },
    });

    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }

    // Calcular médias
    const studentsWithGrades = classData.enrollments.map((enrollment) => {
      const gradesMap = {};
      enrollment.grades.forEach((g) => {
        gradesMap[g.assessmentId] = g.value;
      });

      let totalWeight = 0;
      let weightedSum = 0;

      classData.assessments.forEach((a) => {
        const grade = gradesMap[a.id];
        if (grade !== undefined) {
          weightedSum += grade * a.weight;
          totalWeight += a.weight;
        }
      });

      const media = totalWeight > 0 ? (weightedSum / totalWeight).toFixed(2) : null;

      return {
        enrollmentId: enrollment.id,
        student: enrollment.student,
        grades: classData.assessments.map((a) => ({
          assessmentId: a.id,
          assessmentName: a.name,
          weight: a.weight,
          value: gradesMap[a.id] ?? null,
        })),
        media,
      };
    });

    res.status(200).json({
      class: {
        id: classData.id,
        name: classData.name,
        code: classData.code,
        status: classData.status,
      },
      assessments: classData.assessments,
      students: studentsWithGrades,
    });
  } catch (error) {
    console.error("Erro ao gerar pauta:", error);
    res.status(500).json({ message: "Erro ao gerar pauta", error: error.message });
  }
};

export const updateGrade = async (req, res) => {
  const { id } = req.params;
  const { value } = req.body;

  try {
    const grade = await prisma.grade.findUnique({
      where: { id },
      include: { assessment: { include: { class: true } } },
    });

    if (!grade) {
      return res.status(404).json({ message: "Nota não encontrada" });
    }

    if (grade.assessment.class.trainerId !== req.user.id && req.user.role !== "coordenador") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    if (grade.assessment.class.status === "CLOSED") {
      return res.status(400).json({ message: "Não é possível alterar notas em turma fechada" });
    }

    const updated = await prisma.grade.update({
      where: { id },
      data: { value: Math.round(Number(value)), updatedById: req.user.id },
    });

    res.status(200).json({ message: "Nota atualizada", grade: updated });
  } catch (error) {
    console.error("Erro ao atualizar nota:", error);
    res.status(500).json({ message: "Erro ao atualizar nota", error: error.message });
  }
};