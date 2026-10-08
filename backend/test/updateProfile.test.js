import { test, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";
import bcrypt from "bcrypt";
import { updateProfile, changePassword } from "../src/modules/users/users.controller.js";

// O frontend so manda phone/sexo quando o utilizador mudou o campo. Esta suite
// fixa esse contrato: `undefined` = manter, `null` = apagar. Sem isto, um
// `payload.phone = campoVazio || null` apaga o telefone de quem so muda o nome.

let findUniqueResult = null;
let updateCall = null;
let updateResult = {};
let refreshTokenUpdateCall = null;

const backup = {};

function installStubs() {
  backup.userFindUnique = prisma.user?.findUnique;
  backup.userUpdate = prisma.user?.update;
  backup.refreshTokenUpdateMany = prisma.refreshToken?.updateMany;

  prisma.user.findUnique = async () => findUniqueResult;
  prisma.user.update = async ({ where, data, select }) => {
    updateCall = { where, data, select };
    return updateResult;
  };
  prisma.refreshToken.updateMany = async (args) => {
    refreshTokenUpdateCall = args;
    return { count: 1 };
  };
}

function restoreStubs() {
  if (backup.userFindUnique !== undefined) prisma.user.findUnique = backup.userFindUnique;
  if (backup.userUpdate !== undefined) prisma.user.update = backup.userUpdate;
  if (backup.refreshTokenUpdateMany !== undefined) prisma.refreshToken.updateMany = backup.refreshTokenUpdateMany;
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
  findUniqueResult = {
    id: "form-1",
    name: "Formador A",
    email: "form1@gmail.com",
    role: "formador",
    phone: "84 123 4567",
    sexo: "M",
  };
  updateCall = null;
  updateResult = { id: "form-1", name: "Formador A", email: "form1@gmail.com", phone: "84 123 4567", sexo: "M" };
  refreshTokenUpdateCall = null;
}

after(() => restoreStubs());

test("updateProfile: phone ausente no body mantem o telefone guardado", async () => {
  installStubs();
  resetState();

  const res = mockRes();
  await updateProfile({ user: { id: "form-1" }, body: { name: "Formador B" } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateCall.data.name, "Formador B");
  assert.equal(updateCall.data.phone, "84 123 4567");
});

test("updateProfile: sexo ausente no body mantem o sexo guardado", async () => {
  installStubs();
  resetState();

  const res = mockRes();
  await updateProfile({ user: { id: "form-1" }, body: { name: "Formador B" } }, res);

  assert.equal(updateCall.data.sexo, "M");
});

test("updateProfile: phone alterado e gravado", async () => {
  installStubs();
  resetState();

  const res = mockRes();
  await updateProfile({ user: { id: "form-1" }, body: { name: "Formador B", phone: "84 999 0000" } }, res);

  assert.equal(updateCall.data.phone, "84 999 0000");
});

test("updateProfile: phone null apaga de proposito", async () => {
  installStubs();
  resetState();

  const res = mockRes();
  await updateProfile({ user: { id: "form-1" }, body: { name: "Formador B", phone: null } }, res);

  assert.equal(updateCall.data.phone, null);
});

test("updateProfile: nome vazio nao apaga o nome existente", async () => {
  installStubs();
  resetState();

  const res = mockRes();
  await updateProfile({ user: { id: "form-1" }, body: {} }, res);

  assert.equal(updateCall.data.name, "Formador A");
});

test("updateProfile: 404 quando o user do token nao existe", async () => {
  installStubs();
  resetState();
  findUniqueResult = null;

  const res = mockRes();
  await updateProfile({ user: { id: "fantasma" }, body: { name: "X" } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(updateCall, null);
});

test("changePassword: trocar a senha revoga os refresh tokens nao revogados", async () => {
  installStubs();
  resetState();
  findUniqueResult = { id: "form-1", password: await bcrypt.hash("SenhaAtual1", 4) };

  const res = mockRes();
  await changePassword({ user: { id: "form-1" }, body: { currentPassword: "SenhaAtual1", newPassword: "NovaSenha123" } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(refreshTokenUpdateCall.where.userId, "form-1");
  assert.equal(refreshTokenUpdateCall.where.revokedAt, null, "so tokens ativos");
  assert.ok(refreshTokenUpdateCall.data.revokedAt instanceof Date);
});

test("changePassword: senha atual errada devolve 401 e nao revoga nada", async () => {
  installStubs();
  resetState();
  findUniqueResult = { id: "form-1", password: await bcrypt.hash("SenhaAtual1", 4) };

  const res = mockRes();
  await changePassword({ user: { id: "form-1" }, body: { currentPassword: "errada", newPassword: "NovaSenha123" } }, res);

  assert.equal(res.statusCode, 401);
  assert.equal(refreshTokenUpdateCall, null, "sem troca nao se revogam sessoes");
});