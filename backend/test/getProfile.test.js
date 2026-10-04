import { test, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";
import { getProfile } from "../src/modules/users/users.controller.js";

let findUniqueCall = null;
let findUniqueResult = null;
let findUniqueThrows = false;

const backup = {};

function installStubs() {
  backup.userFindUnique = prisma.user?.findUnique;

  prisma.user.findUnique = async ({ where, select }) => {
    findUniqueCall = { where, select };
    if (findUniqueThrows) throw new Error("db em baixo");
    return findUniqueResult;
  };
}

function restoreStubs() {
  if (backup.userFindUnique !== undefined) prisma.user.findUnique = backup.userFindUnique;
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
  findUniqueCall = null;
  findUniqueResult = null;
  findUniqueThrows = false;
}

after(() => restoreStubs());

test("getProfile: devolve email, telefone e sexo do utilizador autenticado", async () => {
  installStubs();
  resetState();
  findUniqueResult = {
    id: "form-1",
    name: "Formador A",
    email: "form1@gmail.com",
    role: "formador",
    phone: "84 123 4567",
    sexo: "M",
    createdAt: new Date("2026-01-01"),
  };

  const req = { user: { id: "form-1", role: "formador" } };
  const res = mockRes();

  await getProfile(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.email, "form1@gmail.com");
  assert.equal(res.body.user.phone, "84 123 4567");
  assert.equal(res.body.user.sexo, "M");
});

test("getProfile: consulta pelo id do token, ignorando query params", async () => {
  installStubs();
  resetState();
  findUniqueResult = { id: "form-1", name: "Formador A" };

  const req = { user: { id: "form-1", role: "formador" }, query: { id: "outro-user" } };
  const res = mockRes();

  await getProfile(req, res);

  assert.deepEqual(findUniqueCall.where, { id: "form-1" });
});

test("getProfile: o select nunca inclui a password", async () => {
  installStubs();
  resetState();
  findUniqueResult = { id: "form-1", name: "Formador A" };

  const req = { user: { id: "form-1" } };
  const res = mockRes();

  await getProfile(req, res);

  assert.equal(findUniqueCall.select.password, undefined);
  assert.deepEqual(findUniqueCall.select, {
    id: true,
    name: true,
    email: true,
    role: true,
    phone: true,
    sexo: true,
    createdAt: true,
  });
});

test("getProfile: 404 quando o user do token nao existe", async () => {
  installStubs();
  resetState();
  findUniqueResult = null;

  const req = { user: { id: "fantasma" } };
  const res = mockRes();

  await getProfile(req, res);

  assert.equal(res.statusCode, 404);
});

test("getProfile: erro da base de dados devolve 500 e nao rebenta", async () => {
  installStubs();
  resetState();
  findUniqueThrows = true;

  const req = { user: { id: "form-1" } };
  const res = mockRes();

  await getProfile(req, res);

  assert.equal(res.statusCode, 500);
});