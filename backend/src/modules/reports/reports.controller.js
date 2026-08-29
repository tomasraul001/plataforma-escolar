import PDFDocument from "pdfkit";
import prisma from "../../config/prisma.js";

export const generatePautaPDF = async (req, res) => {
  const { classId } = req.params;

  try {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        trainingArea: true,
        trainer: { select: { id: true, name: true, email: true } },
        assessments: { orderBy: { createdAt: "asc" } },
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            student: { select: { id: true, name: true, email: true } },
            grades: { include: { assessment: true } },
          },
        },
      },
    });

    if (!classData) {
      return res.status(404).json({ message: "Turma não encontrada" });
    }

    if (classData.trainerId !== req.user.id && 
        req.user.role !== "coordenador" && 
        req.user.role !== "secretaria") {
      return res.status(403).json({ message: "Acesso negado" });
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

      const media = totalWeight > 0 ? (weightedSum / totalWeight).toFixed(2) : "—";

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

    // Gerar PDF
    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="pauta-${classData.code}.pdf"`);
    
    doc.pipe(res);

    // Header
    doc.fontSize(20).font("Helvetica-Bold").text("PAUTA DE NOTAS", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12).font("Helvetica").text(`Turma: ${classData.name}`, { align: "center" });
    doc.text(`Código: ${classData.code} | Área: ${classData.trainingArea?.name || "—"}`, { align: "center" });
    doc.text(`Formador: ${classData.trainer?.name || "—"}`, { align: "center" });
    doc.text(`Status: ${classData.status}`, { align: "center" });
    doc.moveDown(1);

    // Tabela
    const assessments = classData.assessments;
    const students = classData.enrollments;

    // Calcular larguras
    const pageWidth = doc.page.width - 80; // margem 40 cada lado
    const colStudent = 120;
    const colMedia = 50;
    const remainingWidth = pageWidth - colStudent - colMedia;
    const colAssessment = remainingWidth / assessments.length;

    // Cabeçalho da tabela
    let x = 40;
    const headerY = doc.y;
    
    doc.font("Helvetica-Bold").fontSize(8);
    
    // Coluna Aluno
    doc.rect(x, headerY, colStudent, 20).stroke();
    doc.text("Aluno", x + 2, headerY + 5, { width: colStudent - 4, align: "center" });
    x += colStudent;

    // Colunas Avaliações
    classData.assessments.forEach((a) => {
      doc.rect(x, headerY, colAssessment, 20).stroke();
      doc.text(`${a.name}\n(Peso ${a.weight})`, x + 2, headerY + 2, { 
        width: colAssessment - 4, 
        align: "center",
        lineBreak: false
      });
      x += colAssessment;
    });

    // Coluna Média
    doc.rect(x, headerY, colMedia, 20).stroke();
    doc.text("Média", x + 2, headerY + 5, { width: colMedia - 4, align: "center" });

    doc.y = headerY + 20;

    // Linhas dos alunos
    let rowIndex = 0;
    classData.enrollments.forEach((enrollment) => {
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
      const media = totalWeight > 0 ? (weightedSum / totalWeight).toFixed(2) : "—";

      // Verificar se precisa de nova página
      if (doc.y > 500) {
        doc.addPage();
      }

      x = 40;
      const rowY = doc.y;

      // Zebra striping
      if (rowIndex % 2 === 0) {
        doc.rect(40, rowY, pageWidth, 18).fill("#f8f9fa");
      }

      doc.font("Helvetica").fontSize(8).fillColor("black");

      // Nome do aluno
      doc.rect(40, doc.y, colStudent, 18).stroke();
      doc.text(enrollment.student.name, 42, doc.y + 4, { width: colStudent - 4, align: "left" });

      x = 40 + colStudent;
      
      // Notas
      classData.assessments.forEach((a) => {
        const grade = gradesMap[a.id];
        doc.rect(x, doc.y, colAssessment, 18).stroke();
        const val = gradesMap[a.id] !== undefined ? gradesMap[a.id] : "—";
        doc.text(String(val), x + 2, doc.y + 4, { width: colAssessment - 4, align: "center" });
        x += colAssessment;
      });

      // Média
      doc.rect(x, doc.y, colMedia, 18).stroke();
      doc.text(media, x + 2, doc.y + 4, { width: colMedia - 4, align: "center" });

      doc.y += 18;
      rowIndex++;
    });

    // Rodapé
    doc.moveDown(2);
    doc.fontSize(8).fillColor("gray").text(
      `Gerado em ${new Date().toLocaleDateString("pt-BR")} | Sistema de Gestão Escolar`,
      { align: "center" }
    );

    doc.end();

  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    res.status(500).json({ message: "Erro ao gerar PDF", error: error.message });
  }
};

export const generateCertificadoPDF = async (req, res) => {
  // Placeholder para certificados
  res.status(501).json({ message: "Não implementado ainda" });
};