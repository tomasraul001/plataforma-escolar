import { test, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";
import { listGrades } from "../src/modules/grades/grades.controller.js";

const backup = {};

function installStubs() {
  backup.classFindUnique = prisma.class?.findUnique;
  backup.enrollmentFindFirst = prisma.enrollment?.findFirst;
  backup.gradeFindMany = prisma.grade?.findMany;

  prisma.class.findUnique = async () => null;
  prisma.enrollment.findFirst = async () => null;
  prisma.grade.findMany = async () => [];
}

function restoreStubs() {
  if (backup.classFindUnique !== undefined) prisma.class.findUnique = backup.classFindUnique;
  if (backup.enrollmentFindFirst !== undefined) prisma.enrollment.findFirst = backup.enrollmentFindFirst;
  if (backup.gradeFindMany !== undefined) prisma.grade.findMany = backup.gradeFindMany;
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

after(() => restoreStubs());

test("listGrades: formador de outra turma recebe 403 (IDOR)", async () => {
  installStubs();
  prisma.class.findUnique = async () => ({ id: "c1", trainerId: "trainer-1", status: "OPEN" });

  const req = { params: { classId: "c1" }, user: { id: "trainer-2", role: "formador" } };
  const res = mockRes();

  await listGrades(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, "Acesso negado");
});

test("listGrades: formador dono da turma pode listar", async () => {
  installStubs();
  prisma.class.findUnique = async () => ({ id: "c1", trainerId: "trainer-1", status: "OPEN" });

  const req = { params: { classId: "c1" }, user: { id: "trainer-1", role: "formador" } };
  const res = mockRes();

  await listGrades(req, res);

  assert.equal(res.statusCode, 200);
});

test("listGrades: coordenador pode listar qualquer turma", async () => {
  installStubs();
  prisma.class.findUnique = async () => ({ id: "c1", trainerId: "trainer-1", status: "OPEN" });

  const req = { params: { classId: "c1" }, user: { id: "coord-1", role: "coordenador" } };
  const res = mockRes();

  await listGrades(req, res);

  assert.equal(res.statusCode, 200);
});

test("listGrades: formando inscrito vê apenas as próprias notas", async () => {
  installStubs();
  prisma.class.findUnique = async () => ({ id: "c1", trainerId: "trainer-1", status: "OPEN" });
  prisma.enrollment.findFirst = async () => ({ id: "e1", studentId: "student-1", classId: "c1", status: "ACTIVE" });

  const req = { params: { classId: "c1" }, user: { id: "student-1", role: "formando" } };
  const res = mockRes();

  await listGrades(req, res);

  assert.equal(res.statusCode, 200);
});

test("listGrades: formando sem inscrição recebe 403", async () => {
  installStubs();
  prisma.class.findUnique = async () => ({ id: "c1", trainerId: "trainer-1", status: "OPEN" });
  prisma.enrollment.findFirst = async () => null;

  const req = { params: { classId: "c1" }, user: { id: "student-9", role: "formando" } };
  const res = mockRes();

  await listGrades(req, res);

  assert.equal(res.statusCode, 403);
});