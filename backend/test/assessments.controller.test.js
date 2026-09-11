import { test, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";
import { listAssessments } from "../src/modules/assessments/assessments.controller.js";

const backup = {};

function installStubs() {
  backup.classFindUnique = prisma.class?.findUnique;
  backup.enrollmentFindFirst = prisma.enrollment?.findFirst;
  backup.assessmentFindMany = prisma.assessment?.findMany;

  prisma.class.findUnique = async () => null;
  prisma.enrollment.findFirst = async () => null;
  prisma.assessmentFindMany = async () => [];
}

function restoreStubs() {
  if (backup.classFindUnique !== undefined) prisma.class.findUnique = backup.classFindUnique;
  if (backup.enrollmentFindFirst !== undefined) prisma.enrollment.findFirst = backup.enrollmentFindFirst;
  if (backup.assessmentFindMany !== undefined) prisma.assessment.findMany = backup.assessmentFindMany;
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
  prisma.assessmentFindMany = async () => [];

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
