import { test, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";
import { getClassStats } from "../src/modules/classes/classes.controller.js";

// Testa a contagem DISTINCT do GET /classes/stats (global ou por região).
// Formadores contam 1 mesmo com várias turmas; formandos ativos vêm de turmas
// OPEN/DRAFT e concluídos de CLOSED/ARCHIVED (matrícula ACTIVE, studentId não nulo).

let regions = [];
let classes = [];
let enrollments = [];

function createDelegate(original, extra = {}) {
  return original
    ? { ...original, ...extra }
    : { findUnique: async () => null, findMany: async () => [], ...extra };
}

const backup = {};
let regionExisted = false;

function installStubs() {
  backup.regionFn = prisma.region?.findUnique;
  backup.classFindMany = prisma.class?.findMany;
  backup.enrollFindMany = prisma.enrollment?.findMany;

  regionExisted = !!prisma.region;

  prisma.region = createDelegate(prisma.region, {
    findUnique: async ({ where }) => regions.find((r) => r.id === where.id) || null,
  });

  prisma.class.findMany = async ({ where }) => {
    const list = classes;
    return where?.locationId ? list.filter((c) => c.locationId === where.locationId) : list;
  };

  prisma.enrollment.findMany = async ({ where }) => {
    if (!where?.classId?.in) return [];
    // O controller sempre passa status ACTIVE e studentId not null
    return enrollments.filter(
      (e) => where.classId.in.includes(e.classId) && e.status === "ACTIVE" && e.studentId != null
    );
  };
}

function restoreStubs() {
  if (regionExisted && backup.regionFn !== undefined) prisma.region.findUnique = backup.regionFn;
  if (backup.classFindMany !== undefined) prisma.class.findMany = backup.classFindMany;
  if (backup.enrollFindMany !== undefined) prisma.enrollment.findMany = backup.enrollFindMany;
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

function makeReq(query = {}) {
  return { query };
}

after(() => restoreStubs());

test("stats global: formador com varias turmas conta 1; formandos distintos por grupo de status", async () => {
  installStubs();
  classes = [
    { id: "c1", status: "OPEN", trainerId: "t1", locationId: "reg-a" },
    { id: "c2", status: "OPEN", trainerId: "t1", locationId: "reg-a" },
    { id: "c3", status: "DRAFT", trainerId: "t1", locationId: "reg-a" },
    { id: "c4", status: "CLOSED", trainerId: "t2", locationId: "reg-a" },
    { id: "c5", status: "CLOSED", trainerId: "t2", locationId: "reg-b" },
    { id: "c6", status: "ARCHIVED", trainerId: "t3", locationId: "reg-b" },
  ];
  enrollments = [
    { classId: "c1", status: "ACTIVE", studentId: "s1" },
    { classId: "c1", status: "ACTIVE", studentId: "s2" },
    { classId: "c2", status: "ACTIVE", studentId: "s1" },
    { classId: "c2", status: "ACTIVE", studentId: "s3" },
    { classId: "c3", status: "ACTIVE", studentId: "s4" },
    { classId: "c4", status: "ACTIVE", studentId: "s5" },
    { classId: "c4", status: "ACTIVE", studentId: "s6" },
    { classId: "c5", status: "ACTIVE", studentId: "s5" },
    { classId: "c5", status: "ACTIVE", studentId: "s7" },
    { classId: "c6", status: "ACTIVE", studentId: "s8" },
    { classId: "c6", status: "ACTIVE", studentId: null },
  ];

  const res = mockRes();
  await getClassStats(makeReq({}), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    turmasAbertas: 2,
    turmasFechadas: 2,
    formadores: 3,
    formandosAtivos: 4,
    formandosConcluidos: 4,
  });
});

test("stats por regiao: usa so turmas da regiao", async () => {
  installStubs();
  regions = [{ id: "reg-b", name: "Homoíne" }];
  classes = [
    { id: "c1", status: "OPEN", trainerId: "t1", locationId: "reg-a" },
    { id: "c4", status: "CLOSED", trainerId: "t1", locationId: "reg-b" },
    { id: "c5", status: "CLOSED", trainerId: "t1", locationId: "reg-b" },
    { id: "c6", status: "ARCHIVED", trainerId: "t2", locationId: "reg-b" },
  ];
  enrollments = [
    { classId: "c4", status: "ACTIVE", studentId: "s1" },
    { classId: "c5", status: "ACTIVE", studentId: "s1" },
    { classId: "c5", status: "ACTIVE", studentId: "s2" },
    { classId: "c6", status: "ACTIVE", studentId: "s3" },
    { classId: "c1", status: "ACTIVE", studentId: "s9" },
  ];

  const res = mockRes();
  await getClassStats(makeReq({ regionId: "reg-b" }), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    turmasAbertas: 0,
    turmasFechadas: 2,
    formadores: 2,
    formandosAtivos: 0,
    formandosConcluidos: 3,
  });
});

test("stats: turma sem formador (trainerId nulo) nao infla a contagem de formadores", async () => {
  installStubs();
  classes = [
    { id: "c1", status: "OPEN", trainerId: null, locationId: "reg-a" },
    { id: "c2", status: "OPEN", trainerId: "t1", locationId: "reg-a" },
  ];
  enrollments = [];

  const res = mockRes();
  await getClassStats(makeReq({}), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.formadores, 1);
});

test("stats: regiao inexistente retorna 404", async () => {
  installStubs();
  regions = [{ id: "reg-a", name: "Maxixe" }];

  const res = mockRes();
  await getClassStats(makeReq({ regionId: "reg-zz" }), res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, "Local/Região não encontrada");
});

test("stats: regiao sem turmas retorna tudo zerado", async () => {
  installStubs();
  regions = [{ id: "reg-vazia", name: "Vazia" }];
  classes = [];
  enrollments = [];

  const res = mockRes();
  await getClassStats(makeReq({ regionId: "reg-vazia" }), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    turmasAbertas: 0,
    turmasFechadas: 0,
    formadores: 0,
    formandosAtivos: 0,
    formandosConcluidos: 0,
  });
});