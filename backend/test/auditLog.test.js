import { test, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";
import { auditLog, SENSITIVE_ACTIONS } from "../src/middleware/auditLog.middleware.js";

const backup = {};
let createCalls = [];
let createShouldFail = false;

function installStubs() {
  backup.auditLogCreate = prisma.auditLog?.create;
  prisma.auditLog.create = async ({ data }) => {
    if (createShouldFail) throw new Error("BD indisponivel");
    createCalls.push(data);
    return { id: `log-${createCalls.length}` };
  };
}

function restoreStubs() {
  if (backup.auditLogCreate !== undefined) prisma.auditLog.create = backup.auditLogCreate;
}

function mockRes(statusCode) {
  const res = { statusCode };
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
  createCalls = [];
  createShouldFail = false;
}

function run(action, { statusCode = 200, req = { params: {} }, body = { message: "ok" } } = {}) {
  const res = mockRes(statusCode);
  let nextCalled = false;
  auditLog(action)(req, res, () => {
    nextCalled = true;
  });
  res.json(body);
  return { res, nextCalled };
}

after(() => restoreStubs());

test("auditLog: escreve o log em resposta 2xx", () => {
  installStubs();
  resetState();

  const { res, nextCalled } = run("class.update", {
    req: { user: { id: "trainer-1" }, params: { id: "c1" } },
    body: { message: "Turma atualizada" },
  });

  assert.equal(nextCalled, true);
  assert.equal(res.body.message, "Turma atualizada");
  assert.equal(createCalls.length, 1);
  assert.equal(createCalls[0].action, "class.update");
  assert.equal(createCalls[0].userId, "trainer-1");
  assert.equal(createCalls[0].metadata.targetId, "c1");
  assert.equal(createCalls[0].metadata.responseMessage, "Turma atualizada");
});

test("auditLog: nao escreve em resposta de erro (4xx/5xx)", () => {
  installStubs();
  resetState();

  run("class.update", { statusCode: 403, body: { message: "Acesso negado" } });

  assert.equal(createCalls.length, 0);
});

test("auditLog: falha de escrita nao rejeita a resposta", () => {
  installStubs();
  resetState();
  createShouldFail = true;

  const { res } = run("class.update", { body: { message: "ok" } });

  // O log e fire-and-forget: a resposta tem de chegar ao cliente na mesma
  assert.equal(res.body.message, "ok");
  assert.equal(createCalls.length, 0);
});

test("auditLog: param userId nao autenticado fica null", () => {
  installStubs();
  resetState();

  run("auth.login_failed", { req: { params: {} } });

  assert.equal(createCalls.length, 1);
  assert.equal(createCalls[0].userId, null);
});

test("registry: SENSITIVE_ACTIONS cobre as rotas criticas", () => {
  const esperadas = [
    "class.create",
    "class.update",
    "class.close",
    "class.archive",
    "assessment.update",
    "enrollment.add_manual",
    "attendance.create_session",
    "grade.auto_save",
    "planilha.initialize",
    "planilha.template_update",
    "auth.login_failed",
  ];
  for (const action of esperadas) {
    assert.ok(SENSITIVE_ACTIONS.includes(action), `registry em falta: ${action}`);
  }
});
