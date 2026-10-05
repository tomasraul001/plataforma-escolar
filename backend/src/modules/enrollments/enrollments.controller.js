import prisma from "../../config/prisma.js";
import { isLocked, lockedMessage } from "../../utils/classStatus.js";
import { notifyUser } from "../../utils/notifications.js";

export const joinClass = async (req, res) => {
  const { secretKey, sexo } = req.body;
  const studentId = req.user.id;

  try {
    const classData = await prisma.class.findUnique({
      where: { secretKey },
      include: { trainingArea: true },
    });

    if (!classData) {
      return res.status(404).json({ message: "Chave de turma inválida" });
    }

    if (classData.status !== "OPEN") {
      return res.status(400).json({ message: "Esta turma não está aberta para inscrições" });
    }

    const existing = await prisma.enrollment.findUnique({
      where: { classId_studentId: { classId: classData.id, studentId } },
    });

    if (existing) {
      return res.status(400).json({ message: "Você já está inscrito nesta turma" });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        classId: classData.id,
        studentId,
        status: "ACTIVE",
        sexo: sexo || null,
      },
      include: {
        class: { include: { trainingArea: true, trainer: { select: { name: true } } } },
      },
    });

    // Atualizar sexo no User se estiver vazio
    if (sexo) {
      const studentUser = await prisma.user.findUnique({ where: { id: studentId }, select: { sexo: true } });
      if (studentUser && !studentUser.sexo) {
        await prisma.user.update({ where: { id: studentId }, data: { sexo } });
      }
    }

    // O formador vê o novo aluno no sino em 60s, sem ter de recarregar a página.
    // Non-blocking: se esta escrita falhar, a inscrição já está gravada e o
    // response tem de ser 201 na mesma.
    notifyUser(classData.trainerId, {
      type: "enrollment_joined",
      title: "Novo aluno inscrito",
      body: `${req.user.name || "Um aluno"} entrou na turma ${classData.name}.`,
      link: `/formador/turma/${classData.id}/alunos`,
    });

    res.status(201).json({
      message: "Inscrito na turma com sucesso!",
      enrollment,
    });
  } catch (error) {
    console.error("Erro ao entrar na turma:", error);
    res.status(500).json({ message: "Erro ao entrar na turma" });
  }
};

export const listMyClasses = async (req, res) => {
  const studentId = req.user.id;

  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, status: "ACTIVE" },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            trainingArea: true,
            location: true,
            trainer: { select: { id: true, name: true, email: true } },
            _count: { select: { enrollments: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const classes = enrollments.map((e) => ({
      ...e.class,
      enrollmentId: e.id,
      joinedAt: e.joinedAt,
    }));

    res.status(200).json(classes);
  } catch (error) {
    console.error("Erro ao listar turmas do aluno:", error);
    res.status(500).json({ message: "Erro ao listar turmas" });
  }
};

export const getClassStudents = async (req, res) => {
  const { classId } = req.params;

  try {
    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }

    if (classData.trainerId !== req.user.id && req.user.role !== "coordenador" && req.user.role !== "secretaria") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { classId, status: "ACTIVE" },
      include: {
        student: { select: { id: true, name: true, email: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    res.status(200).json(enrollments);
  } catch (error) {
    console.error("Erro ao buscar alunos da turma:", error);
    res.status(500).json({ message: "Erro ao buscar alunos" });
  }
};

export const addStudentToClass = async (req, res) => {
  const { classId } = req.params;
  const { manualName } = req.body;

  if (!manualName || !manualName.trim()) {
    return res.status(400).json({ message: "Nome do aluno é obrigatório" });
  }

  try {
    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }

    if (classData.trainerId !== req.user.id && req.user.role !== "coordenador") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    if (isLocked(classData.status)) {
      return res.status(400).json({ message: lockedMessage("adicionar alunos") });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        classId,
        manualName: manualName.trim(),
        status: "ACTIVE",
      },
    });

    res.status(201).json({ message: "Aluno adicionado com sucesso", enrollment });
  } catch (error) {
    console.error("Erro ao adicionar aluno:", error);
    res.status(500).json({ message: "Erro ao adicionar aluno" });
  }
};

export const removeStudent = async (req, res) => {
  const { classId, enrollmentId } = req.params;

  try {
    const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment || enrollment.classId !== classId) {
      return res.status(404).json({ message: "Inscrição não encontrada" });
    }

    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }

    if (classData.trainerId !== req.user.id && req.user.role !== "coordenador") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    if (isLocked(classData.status)) {
      return res.status(400).json({ message: lockedMessage("remover alunos") });
    }

    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: "DROPPED" },
    });

    res.status(200).json({ message: "Aluno removido da turma" });
  } catch (error) {
    console.error("Erro ao remover aluno:", error);
    res.status(500).json({ message: "Erro ao remover aluno" });
  }
};