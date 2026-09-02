import { test } from "node:test";
import assert from "node:assert/strict";
import { authorize } from "../src/middleware/auth.middleware.js";

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

test("authorize: permite papel autorizado e chama next", () => {
  let called = false;
  const next = () => (called = true);
  const req = { user: { role: "coordenador" } };
  const res = mockRes();
  authorize("coordenador", "secretaria")(req, res, next);
  assert.equal(called, true);
  assert.equal(res.statusCode, undefined);
});

test("authorize: bloqueia papel não autorizado com 403", () => {
  const next = () => {
    throw new Error("next não deveria ser chamado");
  };
  const req = { user: { role: "formando" } };
  const res = mockRes();
  authorize("coordenador")(req, res, next);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, "Acesso negado!");
});

test("authorize: bloqueia usuário ausente com 403", () => {
  const next = () => {
    throw new Error("next não deveria ser chamado");
  };
  const req = { user: null };
  const res = mockRes();
  authorize("coordenador")(req, res, next);
  assert.equal(res.statusCode, 403);
});
