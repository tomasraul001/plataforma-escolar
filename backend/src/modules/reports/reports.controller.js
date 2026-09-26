import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "../../config/prisma.js";
import { buildPautaPdf } from "./pautaPdf.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, "../../../assets/logo.png");

export const generatePautaPDF = async (req, res) => {
  const { classId } = req.params;

  try {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        trainingArea: true,
        location: true,
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

    let logo = null;
    try {
      logo = fs.readFileSync(LOGO_PATH);
    } catch {
      logo = null;
    }

    const pdf = await buildPautaPdf(classData, { logo });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="pauta-${classData.code}.pdf"`);
    res.setHeader("Content-Length", pdf.length);
    res.send(pdf);

  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    res.status(500).json({ message: "Erro ao gerar PDF" });
  }
};