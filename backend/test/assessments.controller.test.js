import { test, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";
import { listAssessments, createAssessment, updateAssessment } from "../src/modules/assessments/assessments.controller.js";

const backup = {};

let updateResult = null;
const createCalls = [];
const updateCalls = [];

function installStubs() {
  backup.classFindUnique = prisma.class?.findUnique;
  backup.enrollmentFindFirst = prisma.enrollment?.findFirst;
  backup.assessmentFindMany = prisma.assessment?.findMany;
  backup.assessmentFindUnique = prisma.assessment?.findUnique;
  backup.assessmentCreate = prisma.assessment?.create;
  backup.assessmentUpdate = prisma.assessment?.update;

  updateResult = null;
  createCalls.length = 0;
  updateCalls.length = 0;

  prisma.class.findUnique = async () => null;
  prisma.enrollment.findFirst = async () => null;
  prisma.assessment.findMany = async () => [];
  prisma.assessment.findUnique = async () => updateResult;
  prisma.assessment.create = async ({ data }) => {
    createCalls.push(data);
    return { id: "a1", ...data };
  };
  prisma.assessment.update = async (args) => {
    updateCalls.push(args);
    return { id: args.where.id, ...args.data };
  };
}

function restoreStubs() {
  if (backup.classFindUnique !== undefined) prisma.class.findUnique = backup.classFindUnique;
  if (backup.enrollmentFindFirst !== undefined) prisma.enrollment.findFirst = backup.enrollmentFindFirst;
  if (backup.assessmentFindMany !== undefined) prisma.assessment.findMany = backup.assessmentFindMany;
  if (backup.assessmentFindUnique !== undefined) prisma.assessment.findUnique = backup.assessmentFindUnique;
  if (backup.assessmentCreate !== undefined) prisma.assessment.create = backup.assessmentCreate;
  if (backup.assessmentUpdate !== undefined) prisma.assessment.update = backup.assessmentUpdate;
}

function mockRes() {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

after(() => restoreStubs());

test("listAssessments: retorna 404 quando turma nao existe", async () => {
  installStubs();
  prisma.class.findUnique = async () => null;

  const req = { params: { classId: "nonexistent" }, user: { id: "u1", role: "coordenador" } };
  const res = mockRes();

  await listAssessments(req, res);

  assert.equal(res.statusCode, 404);
});

test("listAssessments: formando inscrito pode listar avaliacoes", async () => {
  installStubs();
  prisma.class.findUnique = async () => ({ id: "c1", trainerId: "trainer-1", status: "OPEN" });
  prisma.enrollment.findFirst = async () => ({ id: "e1", studentId: "student-1", classId: "c1", status: "ACTIVE" });
  prisma.assessment.findMany = async () => [{ id: "a1", name: "Teste 1" }];

  const req = { params: { classId: "c1" }, user: { id: "student-1", role: "formando" } };
  const res = mockRes();

  await listAssessments(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 1);
});

test("listAssessments: formando NAO inscrito recebe 403", async () => {
  installStubs();
  prisma.class.findUnique = async () => ({ id: "c1", trainerId: "trainer-1", status: "OPEN" });
  prisma.enrollment.findFirst = async () => null;

  const req = { params: { classId: "c1" }, user: { id: "student-2", role: "formando" } };
  const res = mockRes();

  await listAssessments(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, "Acesso negado");
});

test("listAssessments: formador dono da turma pode listar", async () => {
  installStubs();
  prisma.class.findUnique = async () => ({ id: "c1", trainerId: "trainer-1", status: "OPEN" });
  prisma.assessmentFindMany = async () => [];

  const req = { params: { classId: "c1" }, user: { id: "trainer-1", role: "formador" } };
  const res = mockRes();

  await listAssessments(req, res);

  assert.equal(res.statusCode, 200);
});

test("listAssessments: coordenador pode listar qualquer turma", async () => {
  installStubs();
  prisma.class.findUnique = async () => ({ id: "c1", trainerId: "trainer-1", status: "OPEN" });
  prisma.assessment.findMany = async () => [];

  const req = { params: { classId: "c1" }, user: { id: "coord-1", role: "coordenador" } };
  const res = mockRes();

  await listAssessments(req, res);

  assert.equal(res.statusCode, 200);
});

test("listAssessments: formador de outra turma recebe 403", async () => {
  installStubs();
  prisma.class.findUnique = async () => ({ id: "c1", trainerId: "trainer-1", status: "OPEN" });

  const req = { params: { classId: "c1" }, user: { id: "trainer-2", role: "formador" } };
  const res = mockRes();

  await listAssessments(req, res);

  assert.equal(res.statusCode, 403);
});

const OWNED_OPEN_CLASS = { id: "c1", trainerId: "trainer-1", status: "OPEN" };

test("createAssessment: peso invalido devolve 400 e nao cria", async () => {
  for (const weight of [-1, 0, 101, "2", true]) {
    installStubs();
    prisma.class.findUnique = async () => OWNED_OPEN_CLASS;

    const req = {
      body: { classId: "c1", name: "Teste", weight },
      user: { id: "trainer-1", role: "formador" },
    };
    const res = mockRes();

    await createAssessment(req, res);

    assert.equal(res.statusCode, 400, `peso ${JSON.stringify(weight)} devia dar 400`);
    assert.match(res.body.message, /Peso inválido/);
    assert.equal(createCalls.length, 0, "nao deve escrever peso invalido");
  }
});

test("createAssessment: peso valido e gravado; omitido usa default 1.0", async () => {
  installStubs();
  prisma.class.findUnique = async () => OWNED_OPEN_CLASS;

  await createAssessment(
    { body: { classId: "c1", name: "Teste", weight: 15.5 }, user: { id: "trainer-1", role: "formador" } },
    mockRes(),
  );
  assert.equal(createCalls[0].weight, 15.5);

  await createAssessment(
    { body: { classId: "c1", name: "Exame" }, user: { id: "trainer-1", role: "formador" } },
    mockRes(),
  );
  assert.equal(createCalls[1].weight, 1.0);
});

test("updateAssessment: peso invalido devolve 400 e nao escreve", async () => {
  installStubs();
  updateResult = { id: "a1", class: { trainerId: "trainer-1", status: "OPEN" } };

  const req = {
    params: { id: "a1" },
    body: { weight: "abc" },
    user: { id: "trainer-1", role: "formador" },
  };
  const res = mockRes();

  await updateAssessment(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(updateCalls.length, 0);
});

test("updateAssessment: sem peso mantem o valor atual", async () => {
  installStubs();
  updateResult = { id: "a1", class: { trainerId: "trainer-1", status: "OPEN" } };

  const req = {
    params: { id: "a1" },
    body: { name: "Nome novo" },
    user: { id: "trainer-1", role: "formador" },
  };
  const res = mockRes();

  await updateAssessment(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateCalls.length, 1);
  assert.strictEqual(updateCalls[0].data.weight, undefined, "weight ausente = Prisma ignora");
});
