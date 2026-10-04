import { test, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";
import {
  createSession,
  listSessions,
  getSession,
  bulkUpdateRecords,
  getSummary,
} from "../src/modules/attendance/attendance.controller.js";

const backup = {};

function installStubs() {
  backup.classFindUnique = prisma.class?.findUnique;
  backup.attendanceSessionFindFirst = prisma.attendanceSession?.findFirst;
  backup.enrollmentFindMany = prisma.enrollment?.findMany;
  backup.attendanceRecordFindMany = prisma.attendanceRecord?.findMany;
  backup.attendanceRecordUpdateMany = prisma.attendanceRecord?.updateMany;
  backup.attendanceRecordCreateMany = prisma.attendanceRecord?.createMany;
  backup.transaction = prisma.$transaction;

  prisma.class.findUnique = async () => null;
  prisma.attendanceSession.findFirst = async () => null;
  // getSession e bulkUpdateRecords consultam as inscricoes ativas da turma
  prisma.enrollment.findMany = async () => [];
  prisma.attendanceRecord.findMany = async () => [];
  prisma.attendanceRecord.updateMany = async () => ({ count: 0 });
  prisma.attendanceRecord.createMany = async () => ({ count: 0 });
  // O controller usa $transaction(callback) e $transaction([...promessas]);
  // o stub tem de suportar as duas formas.
  prisma.$transaction = async (arg) => {
    if (typeof arg === "function") return arg(prisma);
    return Promise.all(arg);
  };
}

function restoreStubs() {
  if (backup.classFindUnique !== undefined) prisma.class.findUnique = backup.classFindUnique;
  if (backup.attendanceSessionFindFirst !== undefined) prisma.attendanceSession.findFirst = backup.attendanceSessionFindFirst;
  if (backup.enrollmentFindMany !== undefined) prisma.enrollment.findMany = backup.enrollmentFindMany;
  if (backup.attendanceRecordFindMany !== undefined) prisma.attendanceRecord.findMany = backup.attendanceRecordFindMany;
  if (backup.attendanceRecordUpdateMany !== undefined) prisma.attendanceRecord.updateMany = backup.attendanceRecordUpdateMany;
  if (backup.attendanceRecordCreateMany !== undefined) prisma.attendanceRecord.createMany = backup.attendanceRecordCreateMany;
  if (backup.transaction !== undefined) prisma.$transaction = backup.transaction;
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

const foreignClass = () => ({ id: "c1", trainerId: "trainer-1", status: "OPEN" });
const anotherTrainer = { id: "trainer-2", role: "formador" };

after(() => restoreStubs());

const ownerTrainer = { id: "trainer-1", role: "formador" };

test("createSession: formador de outra turma recebe 403 (IDOR)", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();

  const req = {
    params: { classId: "c1" },
    body: { theme: "Introdução" },
    user: anotherTrainer,
  };
  const res = mockRes();

  await createSession(req, res);

  assert.equal(res.statusCode, 403);
});

test("createSession: formador dono da turma passa da validacao de tema", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();

  const req = {
    params: { classId: "c1" },
    body: { theme: "Introdução" },
    user: ownerTrainer,
  };
  const res = mockRes();

  await createSession(req, res);

  // Sem o stub de attendanceSession.create a transacao falha, o que prova
  // que passou dos guards 400/403 e chegou a tries de criar a sessao.
  assert.notEqual(res.statusCode, 400);
  assert.notEqual(res.statusCode, 403);
});

test("listSessions: formador de outra turma recebe 403 (IDOR)", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();

  const req = { params: { classId: "c1" }, user: anotherTrainer };
  const res = mockRes();

  await listSessions(req, res);

  assert.equal(res.statusCode, 403);
});

test("getSession: formador de outra turma recebe 403 (IDOR)", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();

  const req = { params: { classId: "c1", sessionId: "s1" }, user: anotherTrainer };
  const res = mockRes();

  await getSession(req, res);

  assert.equal(res.statusCode, 403);
});

test("bulkUpdateRecords: formador de outra turma recebe 403 (IDOR)", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();

  const req = { params: { classId: "c1", sessionId: "s1" }, body: { records: [] }, user: anotherTrainer };
  const res = mockRes();

  await bulkUpdateRecords(req, res);

  assert.equal(res.statusCode, 403);
});

test("getSummary: formador de outra turma recebe 403 (IDOR)", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();

  const req = { params: { classId: "c1" }, user: anotherTrainer };
  const res = mockRes();

  await getSummary(req, res);

  assert.equal(res.statusCode, 403);
});

test("getSession: coordenador tem acesso a qualquer turma", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();
  prisma.attendanceSession.findFirst = async () => ({ id: "s1", date: new Date(), records: [] });

  const req = { params: { classId: "c1", sessionId: "s1" }, user: { id: "coord-1", role: "coordenador" } };
  const res = mockRes();

  await getSession(req, res);

  assert.equal(res.statusCode, 200);
});

test("bulkUpdateRecords: inscricao de outra turma e rejeitada com 400 (IDOR)", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();
  prisma.attendanceSession.findFirst = async () => ({ id: "s1" });
  // So "e-desta" pertence a esta turma; "e-de-outra" e de outra turma
  prisma.enrollment.findMany = async () => [{ id: "e-desta" }];

  let transactionCalled = false;
  prisma.$transaction = async (arg) => {
    transactionCalled = true;
    return typeof arg === "function" ? arg(prisma) : Promise.all(arg);
  };

  const req = {
    params: { classId: "c1", sessionId: "s1" },
    body: {
      records: [
        { enrollmentId: "e-desta", present: true },
        { enrollmentId: "e-de-outra", present: false },
      ],
    },
    user: ownerTrainer,
  };
  const res = mockRes();

  await bulkUpdateRecords(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Inscrição não pertence a esta turma");
  assert.equal(transactionCalled, false, "não deve escrever nada quando há inscrição inválida");
});

test("bulkUpdateRecords: inscricao inexistente ou vazia e rejeitada com 400", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();
  prisma.attendanceSession.findFirst = async () => ({ id: "s1" });

  const req = {
    params: { classId: "c1", sessionId: "s1" },
    body: { records: [{ enrollmentId: "", present: true }] },
    user: ownerTrainer,
  };
  const res = mockRes();

  await bulkUpdateRecords(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Inscrição inválida");
});

test("bulkUpdateRecords: inscricoes validas passam a validacao e abrem transacao", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();
  prisma.attendanceSession.findFirst = async () => ({ id: "s1" });
  prisma.enrollment.findMany = async () => [{ id: "e-1" }, { id: "e-2" }];
  prisma.attendanceRecord.findMany = async () => [{ enrollmentId: "e-1" }];

  const created = [];
  prisma.$transaction = async (arg) =>
    typeof arg === "function" ? arg(prisma) : Promise.all(arg);
  prisma.attendanceRecord.updateMany = async () => ({ count: 1 });
  prisma.attendanceRecord.createMany = async ({ data }) => {
    created.push(...data);
    return { count: data.length };
  };

  const req = {
    params: { classId: "c1", sessionId: "s1" },
    body: {
      records: [
        { enrollmentId: "e-1", present: false },
        { enrollmentId: "e-2", present: true },
      ],
    },
    user: ownerTrainer,
  };
  const res = mockRes();

  await bulkUpdateRecords(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(created, [{ sessionId: "s1", enrollmentId: "e-2", present: true }]);
});

test("bulkUpdateRecords: turma arquivada bloqueia a escrita de presencas", async () => {
  installStubs();
  prisma.class.findUnique = async () => ({ id: "c1", trainerId: "trainer-1", status: "ARCHIVED" });

  const req = {
    params: { classId: "c1", sessionId: "s1" },
    body: { records: [] },
    user: ownerTrainer,
  };
  const res = mockRes();

  await bulkUpdateRecords(req, res);

  assert.equal(res.statusCode, 400);
});