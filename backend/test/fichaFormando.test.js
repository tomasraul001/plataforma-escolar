import { test, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";
import { buscarFormandos, getFicha } from "../src/modules/reports/fichaFormando.controller.js";

const backup = {};
let findManyResult = [];
let findUniqueResult = null;
let findFirstResult = null;

function installStubs() {
  backup.userFindMany = prisma.user?.findMany;
  backup.userFindUnique = prisma.user?.findUnique;
  backup.classFindMany = prisma.class?.findMany;
  backup.enrollmentFindMany = prisma.enrollment?.findMany;
  backup.enrollmentFindFirst = prisma.enrollment?.findFirst;

  prisma.user.findMany = async () => findManyResult;
  prisma.user.findUnique = async () => findUniqueResult;
  prisma.class.findMany = async () => [];
  prisma.enrollment.findMany = async () => [];
  prisma.enrollment.findFirst = async () => findFirstResult;
}

function restoreStubs() {
  if (backup.userFindMany !== undefined) prisma.user.findMany = backup.userFindMany;
  if (backup.userFindUnique !== undefined) prisma.user.findUnique = backup.userFindUnique;
  if (backup.classFindMany !== undefined) prisma.class.findMany = backup.classFindMany;
  if (backup.enrollmentFindMany !== undefined) prisma.enrollment.findMany = backup.enrollmentFindMany;
  if (backup.enrollmentFindFirst !== undefined) prisma.enrollment.findFirst = backup.enrollmentFindFirst;
}

function mockRes() {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

function resetState() {
  findManyResult = [];
  findUniqueResult = null;
  findFirstResult = null;
}

after(() => restoreStubs());

test("buscarFormandos: retorna formandos filtrados por nome", async () => {
  installStubs();
  resetState();
  findManyResult = [
    { id: "u1", name: "João Silva", email: "joao@email.com", phone: null, sexo: "M" },
  ];

  const req = { query: { q: "João" }, user: { id: "coord-1", role: "coordenador" } };
  const res = mockRes();

  await buscarFormandos(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].name, "João Silva");
});

test("buscarFormandos: formador so ve formandos das suas turmas", async () => {
  installStubs();
  resetState();

  prisma.class.findMany = async () => [{ id: "class-1" }];
  prisma.enrollment.findMany = async () => [{ studentId: "student-1" }];
  findManyResult = [{ id: "student-1", name: "Aluno", email: "a@email.com", phone: null, sexo: null }];

  const req = { query: {}, user: { id: "trainer-1", role: "formador" } };
  const res = mockRes();

  await buscarFormandos(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 1);
});

test("getFicha: retorna 404 quando formando nao existe", async () => {
  installStubs();
  resetState();
  findUniqueResult = null;

  const req = { params: { userId: "inexistente" }, user: { id: "coord-1", role: "coordenador" } };
  const res = mockRes();

  await getFicha(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, "Formando não encontrado");
});

test("getFicha: retorna ficha com dados pessoais e turmas vazias", async () => {
  installStubs();
  resetState();
  findUniqueResult = { id: "u1", name: "João", email: "j@email.com", phone: "912", sexo: "M", createdAt: new Date() };

  const req = { params: { userId: "u1" }, user: { id: "coord-1", role: "coordenador" } };
  const res = mockRes();

  await getFicha(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.name, "João");
  assert.equal(res.body.turmas.length, 0);
});

test("getFicha: formador sem acesso retorna 403", async () => {
  installStubs();
  resetState();
  findUniqueResult = { id: "u1", name: "João", email: "j@email.com", phone: null, sexo: null, createdAt: new Date() };
  findFirstResult = null;

  const req = { params: { userId: "u1" }, user: { id: "trainer-1", role: "formador" } };
  const res = mockRes();

  await getFicha(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, "Acesso negado a este formando");
});

test("getFicha: formador com acesso retorna 200", async () => {
  installStubs();
  resetState();
  findUniqueResult = { id: "u1", name: "João", email: "j@email.com", phone: null, sexo: null, createdAt: new Date() };
  findFirstResult = { id: "enr-1" };
  prisma.enrollment.findMany = async () => [];

  const req = { params: { userId: "u1" }, user: { id: "trainer-1", role: "formador" } };
  const res = mockRes();

  await getFicha(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.name, "João");
});
