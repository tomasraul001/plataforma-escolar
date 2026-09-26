import test from "node:test";
import assert from "node:assert/strict";
import { buildPautaPdf, computePautaStatus } from "../src/modules/reports/pautaPdf.js";

const assessmentIds = ["a1", "a2", "a3"];
const assessments = [
  { id: "a1", name: "Teste 1" },
  { id: "a2", name: "Trabalho Prático" },
  { id: "a3", name: "Exame" },
];

const makeEnrollment = (id, name, grades, manualName = null) => ({
  id,
  student: name ? { id: `s-${id}`, name, email: `${id}@teste.com` } : null,
  manualName,
  grades: grades.map((value, i) => ({ assessmentId: assessmentIds[i], value })),
});

const makeClass = (overrides = {}) => ({
  id: "c1",
  name: "Turma de Eletricidade A",
  code: "ELET-2025-01",
  status: "CLOSED",
  trainingArea: { id: "t1", name: "Eletricidade" },
  location: { id: "l1", name: "Massinga" },
  trainer: { id: "u1", name: "João Formador", email: "joao@teste.com" },
  assessments,
  enrollments: [
    makeEnrollment("e1", "Ana Maria Macuácua", [12, 15, 10]),
    makeEnrollment("e2", "Bruno Sitoe", [5, 6, 7]),
    makeEnrollment("e3", "Carla Ngovene", []),
    makeEnrollment("e4", null, [10, 10, 10], "Formando Manual"),
  ],
  ...overrides,
});

test("computePautaStatus: fechada usa >9 para aprovar", () => {
  assert.equal(computePautaStatus("CLOSED", 12), "APROVADO");
  assert.equal(computePautaStatus("CLOSED", 10), "APROVADO");
  assert.equal(computePautaStatus("CLOSED", 9), "REPROVADO");
  assert.equal(computePautaStatus("ARCHIVED", null), "SEM AVALIAÇÕES");
  assert.equal(computePautaStatus("OPEN", 15), "EM CURSO");
  assert.equal(computePautaStatus("DRAFT", 2), "EM CURSO");
});

test("buildPautaPdf gera buffer PDF válido", async () => {
  const pdf = await buildPautaPdf(makeClass());
  assert.ok(Buffer.isBuffer(pdf));
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.subarray(pdf.length - 6, pdf.length - 1).equals(Buffer.from("%%EOF")));
  assert.ok(pdf.length > 1500);
});

test("buildPautaPdf com turma sem avaliações não quebra", async () => {
  const pdf = await buildPautaPdf(
    makeClass({ assessments: [], enrollments: [makeEnrollment("e1", "Ana", [])] })
  );
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.length > 500);
});

test("buildPautaPdf com turma vazia e sem logo é válido", async () => {
  const pdf = await buildPautaPdf(makeClass({ enrollments: [] }), {});
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.length > 500);
});

test("buildPautaPdf com muitos alunos pagina corretamente", async () => {
  const enrollments = [];
  for (let i = 0; i < 45; i += 1) {
    enrollments.push(makeEnrollment(`e${i}`, `Formando ${i} de Teste`, [8 + (i % 10), 9, 10]));
  }
  const pdf = await buildPautaPdf(makeClass({ enrollments }));
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.length > 3000);
});