import { test, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";
import { getPlanilha, getPlanilhaTemplate, initializePlanilha } from "../src/modules/grades/planilha.controller.js";

// Stubs por monkey-patch no singleton do prisma (zero dependências).
// gradebookTemplate pode não existir no cliente gerado local, então o
// criamos aqui caso falte (mesmo padrão de createClass.test.js).

const backup = {};
let templateExisted = false;

let classResult = null;
let templateResult = null;
const templateCreateCalls = [];
const templateUpsertCalls = [];
const assessmentCreateCalls = [];

function createDelegate(original) {
  return original
    ? { ...original }
    : { findUnique: async () => null, findMany: async () => [], create: async (x) => x, upsert: async (x) => x };
}

function installStubs() {
  backup.classFindUnique = prisma.class?.findUnique;
  backup.templateFindUnique = prisma.gradebookTemplate?.findUnique;
  backup.templateCreate = prisma.gradebookTemplate?.create;
  backup.templateUpsert = prisma.gradebookTemplate?.upsert;
  backup.assessFindMany = prisma.assessment?.findMany;
  backup.assessCreate = prisma.assessment?.create;
  backup.enrollFindMany = prisma.enrollment?.findMany;

  templateExisted = !!prisma.gradebookTemplate;

  prisma.class.findUnique = async () => classResult;
  prisma.gradebookTemplate = createDelegate(prisma.gradebookTemplate);
  prisma.gradebookTemplate.findUnique = async () => templateResult;
  prisma.gradebookTemplate.create = async ({ data }) => {
    templateCreateCalls.push(data);
    return { id: "tpl-1", ...data };
  };
  prisma.gradebookTemplate.upsert = async (args) => {
    templateUpsertCalls.push(args);
    return { id: "tpl-1", ...args.create };
  };
  prisma.assessment.findMany = async () => [];
  prisma.assessment.create = async ({ data }) => {
    assessmentCreateCalls.push(data);
    return { id: "ass-1", ...data };
  };
  prisma.enrollment.findMany = async () => [];
}

function restoreStubs() {
  if (backup.classFindUnique !== undefined) prisma.class.findUnique = backup.classFindUnique;
  if (backup.assessFindMany !== undefined) prisma.assessment.findMany = backup.assessFindMany;
  if (backup.assessCreate !== undefined) prisma.assessment.create = backup.assessCreate;
  if (backup.enrollFindMany !== undefined) prisma.enrollment.findMany = backup.enrollFindMany;
  if (templateExisted) {
    if (backup.templateFindUnique !== undefined) prisma.gradebookTemplate.findUnique = backup.templateFindUnique;
    if (backup.templateCreate !== undefined) prisma.gradebookTemplate.create = backup.templateCreate;
    if (backup.templateUpsert !== undefined) prisma.gradebookTemplate.upsert = backup.templateUpsert;
  }
}

function mockRes() {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

function resetState() {
  classResult = null;
  templateResult = null;
  templateCreateCalls.length = 0;
  templateUpsertCalls.length = 0;
  assessmentCreateCalls.length = 0;
}

after(() => restoreStubs());

test("getPlanilhaTemplate: formador de outra turma devolve 403 (IDOR)", async () => {
  installStubs();
  resetState();
  classResult = { id: "c1", trainerId: "trainer-dono", status: "OPEN" };

  const req = { params: { classId: "c1" }, user: { id: "trainer-outro", role: "formador" } };
  const res = mockRes();

  await getPlanilhaTemplate(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, "Acesso negado");
});

test("getPlanilhaTemplate: formando devolve 403", async () => {
  installStubs();
  resetState();
  classResult = { id: "c1", trainerId: "trainer-dono", status: "OPEN" };

  const req = { params: { classId: "c1" }, user: { id: "aluno-1", role: "formando" } };
  const res = mockRes();

  await getPlanilhaTemplate(req, res);

  assert.equal(res.statusCode, 403);
});

test("getPlanilhaTemplate: dono devolve 200 com as colunas", async () => {
  installStubs();
  resetState();
  classResult = { id: "c1", trainerId: "trainer-dono", status: "OPEN" };
  templateResult = { columns: [{ id: "teste1", name: "Teste 1" }], isActive: true };

  const req = { params: { classId: "c1" }, user: { id: "trainer-dono", role: "formador" } };
  const res = mockRes();

  await getPlanilhaTemplate(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.columns[0].id, "teste1");
});

test("getPlanilha: turma CLOSED sem template e so-leitura (nao grava)", async () => {
  installStubs();
  resetState();
  classResult = { id: "c1", trainerId: "trainer-dono", status: "CLOSED", name: "T", code: "T1" };
  templateResult = null;

  const req = { params: { classId: "c1" }, user: { id: "trainer-dono", role: "formador" } };
  const res = mockRes();

  await getPlanilha(req, res);

  assert.equal(res.statusCode, 200);
  // Um GET nao pode criar template nem avaliacoes em turma fechada
  assert.equal(templateCreateCalls.length, 0, "GET nao deve criar template");
  assert.equal(assessmentCreateCalls.length, 0, "GET nao deve criar avaliacoes");
  // Mesmo sem template, devolve as colunas padrao
  assert.equal(res.body.columns.length, 4);
  assert.equal(res.body.class.status, "CLOSED");
});

test("getPlanilha: turma OPEN sem template cria template e avaliacoes (regressao)", async () => {
  installStubs();
  resetState();
  classResult = { id: "c1", trainerId: "trainer-dono", status: "OPEN", name: "T", code: "T1" };
  templateResult = null;

  const req = { params: { classId: "c1" }, user: { id: "trainer-dono", role: "formador" } };
  const res = mockRes();

  await getPlanilha(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(templateCreateCalls.length, 1, "turma aberta continua a criar template");
  assert.equal(assessmentCreateCalls.length, 4, "turma aberta continua a criar as 4 avaliacoes padrao");
});

test("initializePlanilha: turma CLOSED devolve 400 e nao faz upsert", async () => {
  installStubs();
  resetState();
  classResult = { id: "c1", trainerId: "trainer-dono", status: "CLOSED" };

  const req = { params: { classId: "c1" }, user: { id: "trainer-dono", role: "formador" } };
  const res = mockRes();

  await initializePlanilha(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /fechada|arquivada/i);
  assert.equal(templateUpsertCalls.length, 0);
});
