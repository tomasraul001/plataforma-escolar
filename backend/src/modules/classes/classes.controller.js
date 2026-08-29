import prisma from "../../config/prisma.js";

function generateSecretKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let key = "";
  for (let i = 0; i < 8; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i === 3) key += "-";
  }
  return key;
}

function generateClassCode(areaName) {
  const prefix = areaName.substring(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${prefix}-${year}-${random}`;
}

export const createClass = async (req, res) => {
  const { name, trainingAreaId, startDate, endDate } = req.body;
  const trainerId = req.user.id;

  try {
    const area = await prisma.trainingArea.findUnique({ where: { id: trainingAreaId } });
    if (!area) {
      return res.status(404).json({ message: "Área de formação não encontrada" });
    }

    const secretKey = generateSecretKey();
    const code = generateClassCode(area.name);

    const newClass = await prisma.class.create({
      data: {
        name,
        code,
        secretKey,
        status: "DRAFT",
        trainerId,
        trainingAreaId,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
      include: {
        trainingArea: true,
      },
    });

    res.status(201).json({
      message: "Turma criada com sucesso",
      class: newClass,
    });
  } catch (error) {
    console.error("Erro ao criar turma:", error);
    res.status(500).json({ message: "Erro ao criar turma", error: error.message, code: error.code });
  }
};

export const listMyClasses = async (req, res) => {
  const trainerId = req.user.id;

  try {
    const classes = await prisma.class.findMany({
      where: { trainerId },
      include: {
        trainingArea: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(classes);
  } catch (error) {
    console.error("Erro ao listar turmas:", error);
    res.status(500).json({ message: "Erro ao listar turmas" });
  }
};

export const getClassById = async (req, res) => {
  const { id } = req.params;

  try {
    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        trainingArea: true,
        trainer: { select: { id: true, name: true, email: true } },
        enrollments: {
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
        },
        assessments: true,
      },
    });

    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }

    if (classData.trainerId !== req.user.id && req.user.role !== "coordenador" && req.user.role !== "secretaria") {
      return res.status(403).json({ message: "Acesso negado a esta turma" });
    }

    res.status(200).json(classData);
  } catch (error) {
    console.error("Erro ao buscar turma:", error);
    res.status(500).json({ message: "Erro ao buscar turma" });
  }
};

export const updateClass = async (req, res) => {
  const { id } = req.params;
  const { name, startDate, endDate, status } = req.body;

  try {
    const classData = await prisma.class.findUnique({ where: { id } });
    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }

    if (classData.trainerId !== req.user.id && req.user.role !== "coordenador") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const updated = await prisma.class.update({
      where: { id },
      data: {
        name,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status,
      },
    });

    res.status(200).json({ message: "Turma atualizada", class: updated });
  } catch (error) {
    console.error("Erro ao atualizar turma:", error);
    res.status(500).json({ message: "Erro ao atualizar turma" });
  }
};

export const closeClass = async (req, res) => {
  const { id } = req.params;

  try {
    const classData = await prisma.class.findUnique({ where: { id } });
    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }

    if (classData.trainerId !== req.user.id && req.user.role !== "coordenador") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    if (classData.status === "CLOSED") {
      return res.status(400).json({ message: "Turma já está fechada" });
    }

    const updated = await prisma.class.update({
      where: { id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
      },
    });

    res.status(200).json({ message: "Turma fechada com sucesso", class: updated });
  } catch (error) {
    console.error("Erro ao fechar turma:", error);
    res.status(500).json({ message: "Erro ao fechar turma" });
  }
};

export const listAllClasses = async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      include: {
        trainingArea: true,
        trainer: { select: { id: true, name: true, email: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(classes);
  } catch (error) {
    console.error("Erro ao listar todas as turmas:", error);
    res.status(500).json({ message: "Erro ao listar turmas" });
  }
};

export const createTrainingArea = async (req, res) => {
  const { name, code, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Nome é obrigatório" });
  }

  const generatedCode = code || name.substring(0, 3).toUpperCase();

  try {
    const area = await prisma.trainingArea.create({
      data: { name, code: generatedCode.toUpperCase(), description },
    });

    res.status(201).json({ message: "Área de formação criada", area });
  } catch (error) {
    console.error("Erro ao criar área:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Nome ou código já existe" });
    }
    res.status(500).json({ message: "Erro ao criar área de formação" });
  }
};

export const listTrainingAreas = async (req, res) => {
  try {
    const areas = await prisma.trainingArea.findMany({
      orderBy: { name: "asc" },
    });

    // Handle null fields for existing records
    const areasWithDefaults = areas.map(area => ({
      ...area,
      code: area.code || area.name.substring(0, 3).toUpperCase(),
      description: area.description || "",
      active: area.active ?? true,
      createdAt: area.createdAt || new Date(),
      updatedAt: area.updatedAt || new Date(),
    }));

    res.status(200).json(areasWithDefaults);
  } catch (error) {
    console.error("Erro ao listar áreas:", error);
    res.status(500).json({ message: "Erro ao listar áreas de formação" });
  }
};

export const updateTrainingArea = async (req, res) => {
  const { id } = req.params;
  const { name, code, description, active } = req.body;

  try {
    const area = await prisma.trainingArea.findUnique({ where: { id } });
    if (!area) {
      return res.status(404).json({ message: "Área de formação não encontrada" });
    }

    const updated = await prisma.trainingArea.update({
      where: { id },
      data: { name, code, description, active },
    });

    res.status(200).json({ message: "Área de formação atualizada", area: updated });
  } catch (error) {
    console.error("Erro ao atualizar área:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Nome ou código já existe" });
    }
    res.status(500).json({ message: "Erro ao atualizar área de formação" });
  }
};

export const deleteTrainingArea = async (req, res) => {
  const { id } = req.params;

  try {
    const area = await prisma.trainingArea.findUnique({
      where: { id },
      include: { _count: { select: { classes: true } } },
    });

    if (!area) {
      return res.status(404).json({ message: "Área de formação não encontrada" });
    }

    if (area._count.classes > 0) {
      return res.status(400).json({ 
        message: `Não é possível excluir. Área possui ${area._count.classes} turma(s) vinculada(s).` 
      });
    }

    await prisma.trainingArea.delete({ where: { id } });

    res.status(200).json({ message: "Área de formação excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir área:", error);
    res.status(500).json({ message: "Erro ao excluir área de formação" });
  }
};