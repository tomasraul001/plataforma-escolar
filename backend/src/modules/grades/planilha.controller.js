import prisma from "../../config/prisma.js";

// Configuração fixa da planilha (hardcoded conforme requisitos)
const DEFAULT_COLUMNS = [
  { id: "teste1", name: "Teste 1", weight: 2, order: 1, type: "grade" },
  { id: "teste2", name: "Teste 2", weight: 2, order: 2, type: "grade" },
  { id: "trabalho", name: "Trabalho Prático", weight: 2, order: 3, type: "grade" },
  { id: "exame", name: "Exame", weight: 3, order: 4, type: "grade" },
];

const TOTAL_WEIGHT = 9; // 2+2+2+3 = 9 (para cálculo de percentual)
const EXAM_WEIGHT_PERCENT = 60; // 60% para exame
const OTHER_WEIGHT_PERCENT = 40; // 40% para testes + trabalho

export const getPlanilha = async (req, res) => {
  const { classId } = req.params;

  try {
    // Verificar permissão
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        trainingArea: true,
        trainer: { select: { id: true, name: true, email: true } },
      },
    });

    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }

    if (classData.trainerId !== req.user.id && req.user.role !== "coordenador") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    // Buscar template da planilha ou criar padrão
    let template = await prisma.gradebookTemplate.findUnique({
      where: { classId },
    });

    if (!template) {
      // Criar template padrão
      template = await prisma.gradebookTemplate.create({
        data: {
          classId,
          columns: DEFAULT_COLUMNS,
          isActive: true,
        },
      });
    }

    // Buscar alunos matriculados ativos
    const enrollments = await prisma.enrollment.findMany({
      where: { classId, status: "ACTIVE" },
      include: {
        student: { select: { id: true, name: true, email: true } },
        grades: {
          include: { assessment: true },
        },
      },
      orderBy: { student: { name: "asc" } },
    });

    // Buscar avaliações existentes para mapear notas
    const assessments = await prisma.assessment.findMany({
      where: { classId },
      orderBy: { createdAt: "asc" },
    });

    // Mapear colunas fixas para assessments
    const columnsMap = {};
    DEFAULT_COLUMNS.forEach((col, index) => {
      const assessment = assessments[index];
      if (assessment) {
        columnsMap[col.id] = { ...col, assessmentId: assessment.id };
      } else {
        columnsMap[col.id] = { ...col, assessmentId: null };
      }
    });

    // Preparar dados dos alunos com notas
    const students = enrollments.map((enrollment, index) => {
      const gradesMap = {};
      enrollment.grades.forEach((g) => {
        gradesMap[g.assessmentId] = g.value;
      });

      const studentGrades = {};
      let totalWeightedSum = 0;
      let totalWeight = 0;

      DEFAULT_COLUMNS.forEach((col) => {
        const assessment = assessments.find((a) => a.name === col.name);
        const gradeValue = assessment ? gradesMap[assessment.id] : null;
        
        studentGrades[col.id] = {
          value: gradeValue,
          assessmentId: assessment?.id || null,
        };

        // Calcular média ponderada: testes + trabalho = 40%, exame = 60%
        if (gradeValue !== null) {
          if (col.id === "exame") {
            totalWeightedSum += gradeValue * 0.6;
            totalWeight += 0.6;
          } else {
            totalWeightedSum += gradeValue * (0.4 / 3); // 40% dividido entre 3
            totalWeight += 0.4 / 3;
          }
        }
      });

      const media = totalWeight > 0 ? parseFloat((totalWeightedSum / totalWeight).toFixed(2)) : null;

      return {
        enrollmentId: enrollment.id,
        rowNumber: index + 1,
        student: enrollment.student,
        grades: studentGrades,
        media: media,
      };
    });

    // Buscar template salvo ou retornar padrão
    const columns = template?.columns || DEFAULT_COLUMNS;

    res.status(200).json({
      class: {
        id: classData.id,
        name: classData.name,
        code: classData.code,
        status: classData.status,
      },
      columns: columns,
      students: students,
    });
  } catch (error) {
    console.error("Erro ao buscar planilha:", error);
    res.status(500).json({ message: "Erro ao buscar planilha", error: error.message });
  }
};

// Auto-salvar nota individual (focus out)
export const autoSaveGrade = async (req, res) => {
  const { classId } = req.params;
  const { enrollmentId, columnId, value } = req.body;

  try {
    // Validar valor
    if (value === "" || value === null || value === undefined) {
      return res.status(400).json({ message: "Valor inválido" });
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 20) {
      return res.status(400).json({ message: "Nota deve ser entre 0 e 20" });
    }

    // Arredondar para 2 casas decimais
    const roundedValue = Math.round(numValue * 100) / 100;

    // Verificar se a turma existe e permissão
    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }

    if (classData.trainerId !== req.user.id && req.user.role !== "coordenador") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    // Verificar se a turma permite lançamento de notas
    if (classData.status === "CLOSED" || classData.status === "ARCHIVED") {
      return res.status(400).json({ message: "Não é possível alterar notas em turma fechada/arquivada" });
    }

    // Encontrar assessment correspondente à coluna
    const columnMap = {
      teste1: "Teste 1",
      teste2: "Teste 2",
      trabalho: "Trabalho Prático",
      exame: "Exame",
    };

    const assessmentName = columnMap[columnId];
    if (!assessmentName) {
      return res.status(400).json({ message: "Coluna inválida" });
    }

    let assessment = await prisma.assessment.findFirst({
      where: { classId, name: assessmentName },
    });

    if (!assessment) {
      // Criar assessment se não existir
      const newAssessment = await prisma.assessment.create({
        data: {
          name: assessmentName,
          weight: columnId === "exame" ? 3 : 1, // Exame tem peso maior
          classId,
        },
      });
      assessment = newAssessment;
    }

    // Verificar inscrição
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment || enrollment.classId !== classId) {
      return res.status(404).json({ message: "Inscrição não encontrada" });
    }

    // Buscar ou criar nota
    const existingGrade = await prisma.grade.findFirst({
      where: { assessmentId: assessment.id, enrollmentId },
    });

    let grade;
    if (existingGrade) {
      grade = await prisma.grade.update({
        where: { id: existingGrade.id },
        data: { value: roundedValue, updatedById: req.user.id },
      });
    } else {
      grade = await prisma.grade.create({
        data: {
          value: roundedValue,
          assessmentId: assessment.id,
          enrollmentId,
          updatedById: req.user.id,
        },
      });
    }

    // Recalcular média do aluno
    await recalculateStudentMedia(enrollment.id);

    res.status(200).json({ 
      success: true, 
      message: "Nota salva com sucesso",
      grade: { ...grade, value: roundedValue },
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro ao salvar nota:", error);
    res.status(500).json({ message: "Erro ao salvar nota", error: error.message });
  }
};

// Função auxiliar para recalcular média do aluno
async function recalculateStudentMedia(enrollmentId) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      grades: { include: { assessment: true } },
      class: { include: { assessments: true } },
    },
  });

  if (!enrollment) return;

  const gradesMap = {};
  enrollment.grades.forEach((g) => {
    gradesMap[g.assessmentId] = g.value;
  });

  const classAssessments = enrollment.class.assessments;
  let totalWeightedSum = 0;
  let totalWeight = 0;

  classAssessments.forEach((a) => {
    const gradeValue = gradesMap[a.id];
    if (gradeValue !== undefined) {
      // Determinar peso baseado no nome
      let weight = 1;
      if (a.name === "Exame") weight = 3; // 60%
      else weight = 1; // 40% / 3 ≈ 13.33% cada

      totalWeightedSum += gradeValue * weight;
      totalWeight += weight;
    }
  });

  const media = totalWeight > 0 ? parseFloat((totalWeightedSum / totalWeight).toFixed(2)) : null;

  // Atualizar média na enrollment (se houver campo) ou deixar calculado em tempo real
  // Por enquanto, retornamos apenas
  return media;
}

// Inicializar template da planilha
export const initializePlanilha = async (req, res) => {
  const { classId } = req.params;

  try {
    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }

    if (classData.trainerId !== req.user.id && req.user.role !== "coordenador") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const template = await prisma.gradebookTemplate.upsert({
      where: { classId },
      update: { columns: DEFAULT_COLUMNS, isActive: true },
      create: { classId, columns: DEFAULT_COLUMNS, isActive: true },
    });

    res.status(200).json({ message: "Planilha inicializada", template });
  } catch (error) {
    console.error("Erro ao inicializar planilha:", error);
    res.status(500).json({ message: "Erro ao inicializar planilha", error: error.message });
  }
};

// Buscar template da planilha
export const getPlanilhaTemplate = async (req, res) => {
  const { classId } = req.params;

  try {
    const template = await prisma.gradebookTemplate.findUnique({ where: { classId } });
    
    if (!template) {
      return res.status(200).json({ columns: DEFAULT_COLUMNS, isActive: true });
    }

    res.status(200).json({ columns: template.columns || [], isActive: template.isActive });
  } catch (error) {
    console.error("Erro ao buscar template:", error);
    res.status(500).json({ message: "Erro ao buscar template" });
  }
}

// Atualizar template
export const updatePlanilhaTemplate = async (req, res) => {
  const { classId } = req.params;
  const { columns, isActive } = req.body;

  try {
    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }

    if (classData.trainerId !== req.user.id && req.user.role !== "coordenador") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const template = await prisma.gradebookTemplate.upsert({
      where: { classId },
      update: { columns, isActive },
      create: { classId, columns, isActive },
    });

    res.status(200).json({ message: "Template atualizado", template });
  } catch (error) {
    console.error("Erro ao atualizar template:", error);
    res.status(500).json({ message: "Erro ao atualizar template" });
  }
}