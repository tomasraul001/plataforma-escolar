import prisma from "../../config/prisma.js";

export const createAssessment = async (req, res) => {
  const { classId, name, weight } = req.body;

  try {
    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }

    if (classData.trainerId !== req.user.id && req.user.role !== "coordenador") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    if (classData.status === "CLOSED") {
      return res.status(400).json({ message: "Não é possível adicionar avaliações em turma fechada" });
    }

    const assessment = await prisma.assessment.create({
      data: {
        name,
        weight: weight || 1.0,
        classId,
      },
    });

    res.status(201).json({ message: "Avaliação criada com sucesso", assessment });
  } catch (error) {
    console.error("Erro ao criar avaliação:", error);
    res.status(500).json({ message: "Erro ao criar avaliação", error: error.message });
  }
};

export const listAssessments = async (req, res) => {
  const { classId } = req.params;

  try {
    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }

    if (classData.trainerId !== req.user.id && 
        req.user.role !== "coordenador" && 
        req.user.role !== "secretaria" &&
        req.user.role !== "formando") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const assessments = await prisma.assessment.findMany({
      where: { classId },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json(assessments);
  } catch (error) {
    console.error("Erro ao listar avaliações:", error);
    res.status(500).json({ message: "Erro ao listar avaliações", error: error.message });
  }
};

export const updateAssessment = async (req, res) => {
  const { id } = req.params;
  const { name, weight } = req.body;

  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!assessment) {
      return res.status(404).json({ message: "Avaliação não encontrada" });
    }

    if (assessment.class.trainerId !== req.user.id && req.user.role !== "coordenador") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    if (assessment.class.status === "CLOSED") {
      return res.status(400).json({ message: "Não é possível alterar avaliações em turma fechada" });
    }

    const updated = await prisma.assessment.update({
      where: { id },
      data: { name, weight },
    });

    res.status(200).json({ message: "Avaliação atualizada", assessment: updated });
  } catch (error) {
    console.error("Erro ao atualizar avaliação:", error);
    res.status(500).json({ message: "Erro ao atualizar avaliação", error: error.message });
  }
};

export const deleteAssessment = async (req, res) => {
  const { id } = req.params;

  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!assessment) {
      return res.status(404).json({ message: "Avaliação não encontrada" });
    }

    if (assessment.class.trainerId !== req.user.id && req.user.role !== "coordenador") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    if (assessment.class.status === "CLOSED") {
      return res.status(400).json({ message: "Não é possível excluir avaliações em turma fechada" });
    }

    await prisma.assessment.delete({ where: { id } });

    res.status(200).json({ message: "Avaliação excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir avaliação:", error);
    res.status(500).json({ message: "Erro ao excluir avaliação", error: error.message });
  }
};