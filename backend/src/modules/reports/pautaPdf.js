import PDFDocument from "pdfkit";
import { calculateMediaByAssessments } from "../grades/assessmentWeights.js";

const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MARGIN = 40;
const LEFT = MARGIN;
const TOP = MARGIN;
const CONTENT_W = PAGE_W - MARGIN * 2;
const MAX_Y = PAGE_H - 50;
const ROW_H = 20;
const HEADER_H = 20;
const COL_NUM = 26;
const COL_MEDIA = 92;

const STATUS_LABEL = {
  OPEN: "ABERTA",
  DRAFT: "RASCUNHO",
  CLOSED: "FECHADA",
  ARCHIVED: "ARQUIVADA",
};

const isFinalStatus = (status) => status === "CLOSED" || status === "ARCHIVED";

export const computePautaStatus = (classStatus, media) => {
  if (isFinalStatus(classStatus)) {
    if (media === null) return "SEM AVALIAÇÕES";
    return media > 9 ? "APROVADO" : "REPROVADO";
  }
  return "EM CURSO";
};

const pngSize = (buffer) => {
  if (!buffer || buffer.length < 24 || buffer.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

const formatDate = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} às ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const mediaOf = (enrollment, assessments) => {
  const gradesMap = {};
  enrollment.grades.forEach((g) => {
    gradesMap[g.assessmentId] = g.value;
  });
  return calculateMediaByAssessments(gradesMap, assessments);
};

const drawWatermark = (doc, logo) => {
  const size = pngSize(logo);
  if (!logo || !size) return;
  const scale = Math.max(PAGE_W / size.width, PAGE_H / size.height);
  const w = size.width * scale;
  const h = size.height * scale;
  doc.save();
  doc.opacity(0.1);
  doc.image(logo, (PAGE_W - w) / 2, (PAGE_H - h) / 2, { width: w, height: h });
  doc.restore();
};

const kv = (doc, x, y, label, value) => {
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#000");
  const labelWidth = doc.widthOfString(label + " ");
  doc.text(label + " ", x, y, { lineBreak: false });
  doc.font("Helvetica").fontSize(9);
  doc.text(value, x + labelWidth, y, { lineBreak: false, width: 210 });
};

const drawHeader = (doc, classData, studentCount, logo) => {
  const size = pngSize(logo);
  if (logo && size) {
    const logoH = 44;
    const logoW = (size.width / size.height) * logoH;
    doc.image(logo, LEFT, TOP, { width: logoW, height: logoH });
  }
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#000");
  doc.text("PAUTA DE NOTAS", 0, TOP + 10, { width: PAGE_W, align: "center", lineBreak: false });

  const by = TOP + 56;
  const boxH = 60;
  doc.save();
  doc.lineWidth(0.75).strokeColor("#000").roundedRect(LEFT, by, CONTENT_W, boxH, 4).stroke();
  doc.restore();

  kv(doc, 52, by + 12, "Turma:", classData.name || "—");
  kv(doc, 340, by + 12, "Código:", classData.code || "—");
  kv(doc, 560, by + 12, "Status:", STATUS_LABEL[classData.status] || classData.status);
  kv(doc, 52, by + 29, "Área:", classData.trainingArea?.name || "—");
  kv(doc, 340, by + 29, "Local:", classData.location?.name || "—");
  kv(doc, 560, by + 29, "Formandos:", String(studentCount));
  kv(doc, 52, by + 46, "Formador:", classData.trainer?.name || "—");

  return by + boxH;
};

const buildColumns = (assessments) => {
  const numCols = assessments.length;
  let colAssess = 0;
  let studentMin = 160;
  if (numCols > 0) {
    colAssess = Math.min(110, (CONTENT_W - COL_NUM - COL_MEDIA - studentMin) / numCols);
    if (colAssess < 42) {
      studentMin = 110;
      colAssess = (CONTENT_W - COL_NUM - COL_MEDIA - studentMin) / numCols;
    }
  }
  const colStudent = CONTENT_W - COL_NUM - colAssess * numCols - COL_MEDIA;

  const columns = [{ key: "num", label: "#", x: LEFT, w: COL_NUM, align: "center" }];
  columns.push({ key: "student", label: "Aluno", x: LEFT + COL_NUM, w: colStudent, align: "left" });
  let cx = LEFT + COL_NUM + colStudent;
  for (let i = 0; i < numCols; i++) {
    columns.push({ key: `assessment:${i}`, label: assessments[i].name, x: cx, w: colAssess, align: "center" });
    cx += colAssess;
  }
  columns.push({ key: "media", label: "Média", x: cx, w: COL_MEDIA, align: "center" });

  return { columns, nameFont: colStudent < 90 ? 7.5 : 8.5, gradeFont: colAssess < 46 ? 6.5 : 8.5 };
};

const drawTableHeader = (doc, y, layout) => {
  doc.save();
  doc.font("Helvetica-Bold").fontSize(8.5);
  layout.columns.forEach((col) => {
    doc.fillColor("#000").rect(col.x, y, col.w, HEADER_H).fill();
    doc.fillColor("#fff");
    doc.text(col.label, col.x + 3, y + 6, { width: col.w - 6, align: col.align, lineBreak: false, ellipsis: true });
  });
  doc.restore();
};

const drawRow = (doc, y, enrollment, layout, assessments, classStatus, rowIndex) => {
  const media = mediaOf(enrollment, assessments);
  const name = enrollment.student?.name || enrollment.manualName || "—";
  const status = computePautaStatus(classStatus, media);

  doc.save();
  if (rowIndex % 2 === 0) {
    doc.fillColor("#f4f4f4").rect(LEFT, y, CONTENT_W, ROW_H).fill();
  }
  doc.strokeColor("#bbb").lineWidth(0.4);
  layout.columns.forEach((col) => {
    doc.rect(col.x, y, col.w, ROW_H).stroke();
  });

  doc.fillColor("#000");
  doc.font("Helvetica").fontSize(8);
  doc.text(String(rowIndex + 1), layout.columns[0].x + 2, y + 5, { width: COL_NUM - 4, align: "center", lineBreak: false });
  doc.font("Helvetica").fontSize(layout.nameFont);
  doc.text(name, LEFT + COL_NUM + 4, y + 5, { width: layout.colStudent - 8, lineBreak: false, ellipsis: true });

  assessments.forEach((a, i) => {
    const col = layout.columns[i + 2];
    const grade = enrollment.grades.find((g) => g.assessmentId === a.id);
    const value = grade ? String(Math.round(grade.value)) : "—";
    doc.fillColor("#000").font("Helvetica").fontSize(layout.gradeFont);
    doc.text(value, col.x + 2, y + 5, { width: col.w - 4, align: "center", lineBreak: false });
  });

  const mediaCol = layout.columns[layout.columns.length - 1];
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#000");
  doc.text(media === null ? "—" : String(media), mediaCol.x + 2, y + 2, { width: mediaCol.w - 4, align: "center", lineBreak: false });
  doc.font(status === "EM CURSO" ? "Helvetica" : "Helvetica-Bold").fontSize(6.8);
  doc.fillColor(status === "EM CURSO" ? "#666" : "#000");
  doc.text(status, mediaCol.x + 2, y + 11, { width: mediaCol.w - 4, align: "center", lineBreak: false });
  doc.restore();
};

const drawSummary = (doc, y, enrollments, assessments, classStatus) => {
  let aprovados = 0;
  let reprovados = 0;
  let semAvaliacoes = 0;
  enrollments.forEach((e) => {
    const status = computePautaStatus(classStatus, mediaOf(e, assessments));
    if (status === "APROVADO") aprovados += 1;
    else if (status === "REPROVADO") reprovados += 1;
    else semAvaliacoes += 1;
  });
  const sumH = ROW_H + 4;
  doc.save();
  doc.fillColor("#e8e8e8").rect(LEFT, y, CONTENT_W, sumH).fill();
  doc.strokeColor("#000").lineWidth(1).rect(LEFT, y, CONTENT_W, sumH).stroke();
  doc.fillColor("#000").font("Helvetica-Bold").fontSize(8.5);
  let text = `Total de formandos: ${enrollments.length}   Aprovados: ${aprovados}   Reprovados: ${reprovados}`;
  if (semAvaliacoes > 0) text += `   Sem avaliações: ${semAvaliacoes}`;
  doc.text(text, LEFT + 8, y + 8, { lineBreak: false });
  doc.restore();
};

const drawFooter = (doc, pageNum, totalPages) => {
  const y = PAGE_H - 42;
  doc.save();
  doc.strokeColor("#bbb").lineWidth(0.5);
  doc.moveTo(LEFT, y).lineTo(PAGE_W - LEFT, y).stroke();
  doc.font("Helvetica").fontSize(7.5).fillColor("#555");
  doc.text(`Gerado em ${formatDate(new Date())} · Sistema de Gestão Escolar`, LEFT, y + 5, { lineBreak: false });
  const pageLabel = `Página ${pageNum} de ${totalPages}`;
  const labelWidth = doc.widthOfString(pageLabel);
  doc.text(pageLabel, PAGE_W - LEFT - labelWidth, y + 5, { lineBreak: false });
  doc.restore();
};

const drawPauta = (doc, classData, logo) => {
  const assessments = classData.assessments || [];
  const enrollments = [...(classData.enrollments || [])].sort((a, b) => {
    const na = (a.student?.name || a.manualName || "").toLowerCase();
    const nb = (b.student?.name || b.manualName || "").toLowerCase();
    return na.localeCompare(nb);
  });

  drawWatermark(doc, logo);
  const layout = buildColumns(assessments);
  let y = drawHeader(doc, classData, enrollments.length, logo) + 8;
  drawTableHeader(doc, y, layout);
  y += HEADER_H + 4;

  let rowIndex = 0;
  for (const enrollment of enrollments) {
    if (y + ROW_H > MAX_Y) {
      doc.addPage();
      drawWatermark(doc, logo);
      drawTableHeader(doc, TOP, layout);
      y = TOP + HEADER_H + 4;
    }
    drawRow(doc, y, enrollment, layout, assessments, classData.status, rowIndex);
    y += ROW_H;
    rowIndex += 1;
  }

  if (isFinalStatus(classData.status) && enrollments.length > 0) {
    const sumH = ROW_H + 4;
    if (y + sumH > MAX_Y) {
      doc.addPage();
      drawWatermark(doc, logo);
      drawTableHeader(doc, TOP, layout);
      y = TOP + HEADER_H + 4;
    }
    drawSummary(doc, y, enrollments, assessments, classData.status);
  }
};

export const buildPautaPdf = (classData, opts = {}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: MARGIN,
      bufferPages: true,
      info: { Title: `Pauta - ${classData.name}`, Author: "Sistema de Gestão Escolar" },
    });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      drawPauta(doc, classData, opts.logo);
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);
        drawFooter(doc, i - range.start + 1, range.count);
      }
      doc.end();
    } catch (error) {
      reject(error);
    }
  });