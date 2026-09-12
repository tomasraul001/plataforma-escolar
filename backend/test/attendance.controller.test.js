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

  prisma.class.findUnique = async () => null;
  prisma.attendanceSession.findFirst = async () => null;
}

function restoreStubs() {
  if (backup.classFindUnique !== undefined) prisma.class.findUnique = backup.classFindUnique;
  if (backup.attendanceSessionFindFirst !== undefined) prisma.attendanceSession.findFirst = backup.attendanceSessionFindFirst;
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

test("createSession: formador de outra turma recebe 403 (IDOR)", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();

  const req = { params: { classId: "c1" }, body: {}, user: anotherTrainer };
  const res = mockRes();

  await createSession(req, res);

  assert.equal(res.statusCode, 403);
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