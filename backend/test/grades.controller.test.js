import { test, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";
import { listGrades, getGradebook, bulkCreateGrades } from "../src/modules/grades/grades.controller.js";

const backup = {};

function installStubs() {
  backup.classFindUnique = prisma.class?.findUnique;
  backup.enrollmentFindFirst = prisma.enrollment?.findFirst;
  backup.enrollmentFindMany = prisma.enrollment?.findMany;
  backup.gradeFindMany = prisma.grade?.findMany;
  backup.assessmentFindUnique = prisma.assessment?.findUnique;
  backup.gradeFindFirst = prisma.grade?.findFirst;
  backup.gradeCreate = prisma.grade?.create;
  backup.gradeUpdate = prisma.grade?.update;

  prisma.class.findUnique = async () => null;
  prisma.enrollment.findFirst = async () => null;
  prisma.enrollment.findMany = async () => [];
  prisma.grade.findMany = async () => [];
  prisma.assessment.findUnique = async () => null;
  prisma.grade.findFirst = async () => null;
  prisma.grade.create = async (args) => ({ id: "g1", ...args.data });
  prisma.grade.update = async (args) => ({ id: args.where?.id || "g1", ...args.data });
}

function restoreStubs() {
  if (backup.classFindUnique !== undefined) prisma.class.findUnique = backup.classFindUnique;
  if (backup.enrollmentFindFirst !== undefined) prisma.enrollment.findFirst = backup.enrollmentFindFirst;
  if (backup.enrollmentFindMany !== undefined) prisma.enrollment.findMany = backup.enrollmentFindMany;
  if (backup.gradeFindMany !== undefined) prisma.grade.findMany = backup.gradeFindMany;
  if (backup.assessmentFindUnique !== undefined) prisma.assessment.findUnique = backup.assessmentFindUnique;
  if (backup.gradeFindFirst !== undefined) prisma.grade.findFirst = backup.gradeFindFirst;
  if (backup.gradeCreate !== undefined) prisma.grade.create = backup.gradeCreate;
  if (backup.gradeUpdate !== undefined) prisma.grade.update = backup.gradeUpdate;
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

test("getGradebook: formador de outra turma recebe 403 (IDOR)", async () => {
  installStubs();
  prisma.class.findUnique = async () => ({ id: "c1", trainerId: "trainer-1", assessments: [], enrollments: [] });

  const req = { params: { classId: "c1" }, user: { id: "trainer-2", role: "formador" } };
  const res = mockRes();

  await getGradebook(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, "Acesso negado");
});

test("getGradebook: formador dono da turma vê a pauta", async () => {
  installStubs();
  prisma.class.findUnique = async () => ({
    id: "c1",
    trainerId: "trainer-1",
    name: "Turma 1",
    code: "INF-2026-001",
    status: "OPEN",
    location: null,
    assessments: [],
    enrollments: [],
  });

  const req = { params: { classId: "c1" }, user: { id: "trainer-1", role: "formador" } };
  const res = mockRes();

  await getGradebook(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.students, []);
});

test("getGradebook: coordenador pode ver a pauta de qualquer turma", async () => {
  installStubs();
  prisma.class.findUnique = async () => ({
    id: "c1",
    trainerId: "trainer-1",
    name: "Turma 1",
    code: "INF-2026-001",
    status: "OPEN",
    location: null,
    assessments: [],
    enrollments: [],
  });

  const req = { params: { classId: "c1" }, user: { id: "coord-1", role: "coordenador" } };
  const res = mockRes();

  await getGradebook(req, res);

  assert.equal(res.statusCode, 200);
});

test("bulkCreateGrades: enrollment de outra turma recebe 400 e não escreve nota", async () => {
  installStubs();
  prisma.assessment.findUnique = async () => ({
    id: "a1",
    classId: "c1",
    class: { trainerId: "trainer-1", status: "OPEN" },
  });
  prisma.enrollment.findMany = async () => [];

  let created = 0;
  let updated = 0;
  prisma.grade.create = async () => {
    created += 1;
    return { id: "g1" };
  };
  prisma.grade.update = async () => {
    updated += 1;
    return { id: "g1" };
  };

  const req = {
    body: { assessmentId: "a1", grades: [{ enrollmentId: "e-foreign", value: 15 }] },
    user: { id: "trainer-1", role: "formador" },
  };
  const res = mockRes();

  await bulkCreateGrades(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Inscrição não pertence a esta turma");
  assert.equal(created, 0);
  assert.equal(updated, 0);
});

test("bulkCreateGrades: lote válido grava as notas", async () => {
  installStubs();
  prisma.assessment.findUnique = async () => ({
    id: "a1",
    classId: "c1",
    class: { trainerId: "trainer-1", status: "OPEN" },
  });
  prisma.enrollment.findMany = async () => [{ id: "e1" }, { id: "e2" }];
  prisma.grade.findFirst = async () => null;

  const req = {
    body: {
      assessmentId: "a1",
      grades: [
        { enrollmentId: "e1", value: 15 },
        { enrollmentId: "e2", value: 18 },
      ],
    },
    user: { id: "trainer-1", role: "formador" },
  };
  const res = mockRes();

  await bulkCreateGrades(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.count, 2);
});

test("bulkCreateGrades: nota fora do intervalo recebe 400", async () => {
  installStubs();
  prisma.assessment.findUnique = async () => ({
    id: "a1",
    classId: "c1",
    class: { trainerId: "trainer-1", status: "OPEN" },
  });

  const req = {
    body: { assessmentId: "a1", grades: [{ enrollmentId: "e1", value: 25 }] },
    user: { id: "trainer-1", role: "formador" },
  };
  const res = mockRes();

  await bulkCreateGrades(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Nota deve ser entre 0 e 20");
});