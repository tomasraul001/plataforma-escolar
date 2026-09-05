import { test, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";
import { listAllClasses } from "../src/modules/classes/classes.controller.js";

let findManyCalls = [];
let findManyResult = [];

const backup = {};

function installStubs() {
  backup.classFindMany = prisma.class?.findMany;

  prisma.class.findMany = async (args) => {
    findManyCalls.push(args);
    return findManyResult;
  };
}

function restoreStubs() {
  if (backup.classFindMany !== undefined) prisma.class.findMany = backup.classFindMany;
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