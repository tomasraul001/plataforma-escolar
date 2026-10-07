import { test, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";
import { listAllClasses, archiveClass, updateClass, getClassById } from "../src/modules/classes/classes.controller.js";

let findManyCalls = [];
let findManyResult = [];
let findUniqueResult = null;
let updateCalls = [];

const backup = {};

function installStubs() {
  backup.classFindMany = prisma.class?.findMany;
  backup.classFindUnique = prisma.class?.findUnique;
  backup.classUpdate = prisma.class?.update;

  prisma.class.findMany = async (args) => {
    findManyCalls.push(args);
    return findManyResult;
  };

  prisma.class.findUnique = async () => {
    return findUniqueResult;
  };

  prisma.class.update = async (args) => {
    updateCalls.push(args);
    return { ...findUniqueResult, ...args.data };
  };
}

function restoreStubs() {
  if (backup.classFindMany !== undefined) prisma.class.findMany = backup.classFindMany;
  if (backup.classFindUnique !== undefined) prisma.class.findUnique = backup.classFindUnique;
  if (backup.classUpdate !== undefined) prisma.class.update = backup.classUpdate;
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
  findManyCalls = [];
  findManyResult = [];
  findUniqueResult = null;
  updateCalls = [];
}

after(() => restoreStubs());

test("listAllClasses: retorna a lista de turmas com o include completo", async () => {
  installStubs();
  resetState();
  findManyResult = [{ id: "turma-1", name: "Turma A" }];

  const req = { user: { id: "coord-1", role: "coordenador" } };
  const res = mockRes();

  await listAllClasses(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].id, "turma-1");
  assert.equal(findManyCalls.length, 1);
  assert.ok(findManyCalls[0].include.trainingArea);
  assert.ok(findManyCalls[0].include.location);
  assert.ok(findManyCalls[0].include.trainer);
  assert.ok(findManyCalls[0].include._count);
  assert.deepEqual(findManyCalls[0].orderBy, { createdAt: "desc" });
});

test("listAllClasses: retorna 500 quando o banco falha", async () => {
  installStubs();
  resetState();
  prisma.class.findMany = async () => {
    throw new Error("conexao recusada");
  };

  const req = { user: { id: "coord-1", role: "coordenador" } };
  const res = mockRes();

  await listAllClasses(req, res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.message, "Erro ao listar turmas");

  prisma.class.findMany = backup.classFindMany;
});

test("archiveClass: retorna 404 quando turma nao existe", async () => {
  installStubs();
  resetState();
  findUniqueResult = null;

  const req = { params: { id: "turma-inexistente" }, user: { id: "sec-1", role: "secretaria" } };
  const res = mockRes();

  await archiveClass(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, "Turma não encontrada");
});

test("archiveClass: retorna 400 quando turma nao esta CLOSED", async () => {
  installStubs();
  resetState();
  findUniqueResult = { id: "turma-1", status: "OPEN" };

  const req = { params: { id: "turma-1" }, user: { id: "sec-1", role: "secretaria" } };
  const res = mockRes();

  await archiveClass(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Só é possível arquivar turmas fechadas");
});

test("archiveClass: arquivamento bem sucedido com archivedAt definido", async () => {
  installStubs();
  resetState();
  findUniqueResult = { id: "turma-1", status: "CLOSED" };

  const req = { params: { id: "turma-1" }, user: { id: "sec-1", role: "secretaria" } };
  const res = mockRes();

  await archiveClass(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, "Turma arquivada com sucesso");
  assert.equal(updateCalls.length, 1);
  assert.equal(updateCalls[0].data.status, "ARCHIVED");
  assert.ok(updateCalls[0].data.archivedAt);
});

test("archiveClass: coordenador tambem pode arquivar", async () => {
  installStubs();
  resetState();
  findUniqueResult = { id: "turma-1", status: "CLOSED" };

  const req = { params: { id: "turma-1" }, user: { id: "coord-1", role: "coordenador" } };
  const res = mockRes();

  await archiveClass(req, res);

  assert.equal(res.statusCode, 200);
});

test("listAllClasses: resposta nao inclui secretKey", async () => {
  installStubs();
  resetState();
  findManyResult = [{ id: "turma-1", name: "Turma A", secretKey: "ABCD-1234" }];

  const req = { user: { id: "sec-1", role: "secretaria" } };
  const res = mockRes();

  await listAllClasses(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body[0].id, "turma-1");
  assert.equal("secretKey" in res.body[0], false);
});

test("getClassById: resposta nao inclui secretKey", async () => {
  installStubs();
  resetState();
  findUniqueResult = {
    id: "turma-1",
    trainerId: "trainer-1",
    status: "OPEN",
    secretKey: "ABCD-1234",
    trainingArea: null,
    location: null,
    trainer: { id: "trainer-1", name: "F", email: "f@x.com" },
    enrollments: [],
    assessments: [],
  };

  const req = { params: { id: "turma-1" }, user: { id: "trainer-1", role: "formador" } };
  const res = mockRes();

  await getClassById(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal("secretKey" in res.body, false);
  assert.equal(res.body.id, "turma-1");
});

test("updateClass: rejeita status fora do whitelist", async () => {
  installStubs();
  resetState();
  findUniqueResult = { id: "turma-1", trainerId: "trainer-1", status: "OPEN", startDate: new Date() };

  const req = {
    params: { id: "turma-1" },
    body: { status: "HACKED" },
    user: { id: "trainer-1", role: "formador" },
  };
  const res = mockRes();

  await updateClass(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Status inválido/);
  assert.equal(updateCalls.length, 0, "nao deve escrever na BD com status invalido");
});

test("updateClass: turma arquivada nao muda de status", async () => {
  installStubs();
  resetState();
  findUniqueResult = { id: "turma-1", trainerId: "trainer-1", status: "ARCHIVED" };

  const req = {
    params: { id: "turma-1" },
    body: { status: "OPEN" },
    user: { id: "trainer-1", role: "formador" },
  };
  const res = mockRes();

  await updateClass(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /arquivada/);
  assert.equal(updateCalls.length, 0, "formador nao pode desfazer arquivamento");
});

test("updateClass: transicao OPEN -> CLOSED continua a funcionar (UI)", async () => {
  installStubs();
  resetState();
  findUniqueResult = { id: "turma-1", trainerId: "trainer-1", status: "OPEN" };

  const req = {
    params: { id: "turma-1" },
    body: { status: "CLOSED" },
    user: { id: "trainer-1", role: "formador" },
  };
  const res = mockRes();

  await updateClass(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateCalls[0].data.status, "CLOSED");
  assert.ok(updateCalls[0].data.closedAt, "fecho define closedAt");
});

test("updateClass: sem startDate mantem a data atual (nao apaga)", async () => {
  installStubs();
  resetState();
  findUniqueResult = {
    id: "turma-1",
    trainerId: "trainer-1",
    status: "OPEN",
    startDate: new Date("2026-01-10"),
  };

  const req = {
    params: { id: "turma-1" },
    body: { status: "CLOSED" },
    user: { id: "trainer-1", role: "formador" },
  };
  const res = mockRes();

  await updateClass(req, res);

  assert.equal(res.statusCode, 200);
  // undefined = Prisma ignora e preserva; null apagaria a data (bug antigo)
  assert.strictEqual(updateCalls[0].data.startDate, undefined);
});

test("updateClass: startDate invalido devolve 400 e nao escreve", async () => {
  installStubs();
  resetState();
  findUniqueResult = { id: "turma-1", trainerId: "trainer-1", status: "OPEN" };

  const req = {
    params: { id: "turma-1" },
    body: { startDate: "data-invalida" },
    user: { id: "trainer-1", role: "formador" },
  };
  const res = mockRes();

  await updateClass(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /início inválida/);
  assert.equal(updateCalls.length, 0);
});