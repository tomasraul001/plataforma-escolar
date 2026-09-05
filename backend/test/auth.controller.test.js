import { test, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../src/config/prisma.js";
import { register, login } from "../src/modules/auth/auth.controller.js";

process.env.COORDENADOR_KEY = "chave-coordenador";
process.env.FORMADOR_KEY = "chave-formador";
process.env.FORMANDO_KEY = "chave-formando";
process.env.SECRETARIA_KEY = "chave-secretaria";
process.env.SECRET_KEY = "segredo-teste";

const storedUsers = [];
let findUniqueCalls = [];
let createCalls = [];
let returnUser = null;

const backup = {};

function installStubs() {
  backup.userFindUnique = prisma.user?.findUnique;
  backup.userCreate = prisma.user?.create;

  prisma.user.findUnique = async ({ where }) => {
    findUniqueCalls.push(where);
    if (returnUser) return returnUser;
    return storedUsers.find((u) => u.email === where.email) || null;
  };

  prisma.user.create = async ({ data }) => {
    createCalls.push(data);
    storedUsers.push(data);
    return { id: "user-123", ...data };
  };
}

function restoreStubs() {
  if (backup.userFindUnique !== undefined) prisma.user.findUnique = backup.userFindUnique;
  if (backup.userCreate !== undefined) prisma.user.create = backup.userCreate;
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
  storedUsers.length = 0;
  findUniqueCalls = [];
  createCalls = [];
  returnUser = null;
}

after(() => restoreStubs());

test("register: cria usuario com acesso valido, senha hasheada e role correto", async () => {
  installStubs();
  resetState();

  const req = {
    body: { name: "João", email: "Joao@Email.com", password: "123456", accessKey: "chave-formador" },
  };
  const res = mockRes();

  await register(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createCalls.length, 1);
  const data = createCalls[0];
  assert.equal(data.name, "João");
  assert.equal(data.email, "joao@email.com");
  assert.equal(data.role, "formador");
  assert.notEqual(data.password, "123456");
  assert.equal(await bcrypt.compare("123456", data.password), true);
});

test("register: rejeita chave de acesso invalida com 401", async () => {
  installStubs();
  resetState();

  const req = {
    body: { name: "João", email: "joao@email.com", password: "123456", accessKey: "chave-errada" },
  };
  const res = mockRes();

  await register(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Chave de acesso inválida!");
  assert.equal(createCalls.length, 0);
});

test("register: retorna 400 quando o email ja existe", async () => {
  installStubs();
  resetState();
  storedUsers.push({ email: "joao@email.com", name: "Existente" });

  const req = {
    body: { name: "João", email: "joao@email.com", password: "123456", accessKey: "chave-formador" },
  };
  const res = mockRes();

  await register(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Este email ja existe");
  assert.equal(createCalls.length, 0);
});

test("login: retorna 404 quando o usuario nao existe", async () => {
  installStubs();
  resetState();

  const req = { body: { email: "naoexiste@email.com", password: "123456" } };
  const res = mockRes();

  await login(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, "Usuário não encontrado!");
});

test("login: retorna 401 quando a senha esta incorreta", async () => {
  installStubs();
  resetState();
  returnUser = {
    id: "user-123",
    name: "João",
    email: "joao@email.com",
    role: "formador",
    password: await bcrypt.hash("senha-certa", 10),
  };

  const req = { body: { email: "joao@email.com", password: "senha-errada" } };
  const res = mockRes();

  await login(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Senha incorreta!");
});

test("login: sucesso retorna token com id/role/email e dados do usuario", async () => {
  installStubs();
  resetState();
  returnUser = {
    id: "user-123",
    name: "João",
    email: "joao@email.com",
    role: "coordenador",
    password: await bcrypt.hash("senha-certa", 10),
  };

  const req = { body: { email: "Joao@Email.com", password: "senha-certa" } };
  const res = mockRes();

  await login(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, "Login realizado com sucesso!");
  assert.equal(res.body.role, "coordenador");
  assert.equal(res.body.name, "João");
  assert.equal(res.body.id, "user-123");

  const decoded = jwt.verify(res.body.token, process.env.SECRET_KEY);
  assert.equal(decoded.id, "user-123");
  assert.equal(decoded.role, "coordenador");
});