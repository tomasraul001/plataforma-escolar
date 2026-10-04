import { test, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";
import { getAllUsers, deleteUser } from "../src/modules/users/users.controller.js";

const users = [
  { id: "coord-1", name: "Coord", email: "coord@x.com", role: "coordenador" },
  { id: "sec-1", name: "Sec", email: "sec@x.com", role: "secretaria" },
  { id: "form-1", name: "Formador A", email: "form1@x.com", role: "formador" },
  { id: "form-2", name: "Formador B", email: "form2@x.com", role: "formador" },
  { id: "aluno-1", name: "Aluno A", email: "aluno1@x.com", role: "formando" },
];

let findManyCall = null;
let findUniqueCall = null;
let deleteCalls = [];
let countCalls = [];
let findManyResult = [];
let findUniqueResult = null;
let countResult = { class: 0, enrollment: 0, grade: 0, auditLog: 0 };

const backup = {};

function installStubs() {
  backup.userFindMany = prisma.user?.findMany;
  backup.userFindUnique = prisma.user?.findUnique;
  backup.userDelete = prisma.user?.delete;
  backup.classCount = prisma.class?.count;
  backup.enrollmentCount = prisma.enrollment?.count;
  backup.gradeCount = prisma.grade?.count;
  backup.auditLogCount = prisma.auditLog?.count;

  prisma.user.findMany = async ({ where, select }) => {
    findManyCall = { where, select };
    return findManyResult;
  };

  prisma.user.findUnique = async ({ where }) => {
    findUniqueCall = where;
    return findUniqueResult;
  };

  prisma.user.delete = async ({ where }) => {
    deleteCalls.push(where);
    return {};
  };

  prisma.class.count = async ({ where }) => {
    countCalls.push({ model: "class", where });
    return countResult.class;
  };
  prisma.enrollment.count = async ({ where }) => {
    countCalls.push({ model: "enrollment", where });
    return countResult.enrollment;
  };
  prisma.grade.count = async ({ where }) => {
    countCalls.push({ model: "grade", where });
    return countResult.grade;
  };
  prisma.auditLog.count = async ({ where }) => {
    countCalls.push({ model: "auditLog", where });
    return countResult.auditLog;
  };
}

function restoreStubs() {
  if (backup.userFindMany !== undefined) prisma.user.findMany = backup.userFindMany;
  if (backup.userFindUnique !== undefined) prisma.user.findUnique = backup.userFindUnique;
  if (backup.userDelete !== undefined) prisma.user.delete = backup.userDelete;
  if (backup.classCount !== undefined) prisma.class.count = backup.classCount;
  if (backup.enrollmentCount !== undefined) prisma.enrollment.count = backup.enrollmentCount;
  if (backup.gradeCount !== undefined) prisma.grade.count = backup.gradeCount;
  if (backup.auditLogCount !== undefined) prisma.auditLog.count = backup.auditLogCount;
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
  findManyCall = null;
  findUniqueCall = null;
  deleteCalls = [];
  countCalls = [];
  findManyResult = [];
  findUniqueResult = null;
  countResult = { class: 0, enrollment: 0, grade: 0, auditLog: 0 };
}

after(() => restoreStubs());

test("getAllUsers: coordenador ve so formadores e formandos", async () => {
  installStubs();
  resetState();
  findManyResult = users.filter((u) => ["formador", "formando"].includes(u.role));

  const req = { user: { id: "coord-1", role: "coordenador" } };
  const res = mockRes();

  await getAllUsers(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 3);
  assert.deepEqual(findManyCall.where, { role: { in: ["formador", "formando"] } });
  assert.deepEqual(findManyCall.select, { id: true, name: true, email: true, role: true });
});

test("getAllUsers: secretaria usa o mesmo filtro do coordenador", async () => {
  installStubs();
  resetState();

  const req = { user: { id: "sec-1", role: "secretaria" } };
  const res = mockRes();

  await getAllUsers(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(findManyCall.where, { role: { in: ["formador", "formando"] } });
});

test("getAllUsers: formador ve somente formandos", async () => {
  installStubs();
  resetState();
  findManyResult = users.filter((u) => u.role === "formando");

  const req = { user: { id: "form-1", role: "formador" } };
  const res = mockRes();

  await getAllUsers(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(findManyCall.where, { role: "formando" });
});

test("getAllUsers: papel sem permissao recebe 403 Acesso negado e nao consulta o banco", async () => {
  installStubs();
  resetState();

  const req = { user: { id: "aluno-1", role: "formando" } };
  const res = mockRes();

  await getAllUsers(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, "Acesso negado");
  assert.equal(findManyCall, null);
});

test("deleteUser: nao permite excluir a propria conta", async () => {
  installStubs();
  resetState();

  const req = { params: { id: "coord-1" }, user: { id: "coord-1" } };
  const res = mockRes();

  await deleteUser(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Não é possível excluir a própria conta");
  assert.equal(findUniqueCall, null);
  assert.equal(deleteCalls.length, 0);
});

test("deleteUser: retorna 404 quando o usuario nao existe", async () => {
  installStubs();
  resetState();
  findUniqueResult = null;

  const req = { params: { id: "inexistente" }, user: { id: "coord-1" } };
  const res = mockRes();

  await deleteUser(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, "Usuário não encontrado");
  assert.deepEqual(findUniqueCall, { id: "inexistente" });
  assert.equal(deleteCalls.length, 0);
});

test("deleteUser: exclui outro usuario com sucesso", async () => {
  installStubs();
  resetState();
  findUniqueResult = users.find((u) => u.id === "aluno-1");

  const req = { params: { id: "aluno-1" }, user: { id: "coord-1" } };
  const res = mockRes();

  await deleteUser(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, "Usuário excluído com sucesso");
  assert.deepEqual(deleteCalls, [{ id: "aluno-1" }]);
});

test("deleteUser: formador com turmas recebe 409 em vez de 500", async () => {
  installStubs();
  resetState();
  findUniqueResult = users.find((u) => u.id === "form-1");
  countResult = { ...countResult, class: 2 };

  const req = { params: { id: "form-1" }, user: { id: "coord-1" } };
  const res = mockRes();

  await deleteUser(req, res);

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /Não é possível excluir um utilizador com registos associados/);
  assert.match(res.body.message, /2 turma\(s\) como formador/);
  assert.equal(deleteCalls.length, 0);
});

test("deleteUser: formando com inscricoes e notas recebe 409 com o detalhe", async () => {
  installStubs();
  resetState();
  findUniqueResult = users.find((u) => u.id === "aluno-1");
  countResult = { class: 0, enrollment: 3, grade: 12, auditLog: 0 };

  const req = { params: { id: "aluno-1" }, user: { id: "coord-1" } };
  const res = mockRes();

  await deleteUser(req, res);

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /3 inscrição\(ões\) como formando/);
  assert.match(res.body.message, /12 nota\(s\) lançada\(s\) por si/);
  assert.equal(deleteCalls.length, 0);
});

test("deleteUser: consulta as quatro dependencias antes de apagar", async () => {
  installStubs();
  resetState();
  findUniqueResult = users.find((u) => u.id === "aluno-1");

  const req = { params: { id: "aluno-1" }, user: { id: "coord-1" } };
  const res = mockRes();

  await deleteUser(req, res);

  assert.deepEqual(
    countCalls.map((c) => c.model).sort(),
    ["auditLog", "class", "enrollment", "grade"]
  );
  assert.deepEqual(countCalls.find((c) => c.model === "class").where, { trainerId: "aluno-1" });
  assert.deepEqual(countCalls.find((c) => c.model === "enrollment").where, { studentId: "aluno-1" });
  assert.deepEqual(countCalls.find((c) => c.model === "grade").where, { updatedById: "aluno-1" });
  assert.deepEqual(countCalls.find((c) => c.model === "auditLog").where, { userId: "aluno-1" });
});

test("deleteUser: erro de chave estrangeira P2003 vira 409 e nao 500", async () => {
  installStubs();
  resetState();
  findUniqueResult = users.find((u) => u.id === "aluno-1");
  prisma.user.delete = async () => {
    const err = new Error("Foreign key constraint violated");
    err.code = "P2003";
    throw err;
  };

  const req = { params: { id: "aluno-1" }, user: { id: "coord-1" } };
  const res = mockRes();

  await deleteUser(req, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.message, "Não é possível excluir um utilizador com registos associados.");
});