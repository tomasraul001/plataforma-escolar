import { test, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";
import { createClass } from "../src/modules/classes/classes.controller.js";

// Stubs por monkey-patch no singleton do prisma (zero dependências).
// O controller importa o mesmo objeto `prisma`, então usa os stubs abaixo.
// O `region` pode não existir no cliente gerado local (gitignored/desatualizado),
// então o criamos aqui caso falte.

let area = null;
let region = null;
let createdClass = null;
const createdAssessments = [];

function createDelegate(original, extra = {}) {
  const delegate = original
    ? { ...original, ...extra }
    : { findUnique: async () => null, findMany: async () => [], create: async (x) => x, ...extra };
  return delegate;
}

const backup = {};
let regionExisted = false;

function installStubs() {
  // Guarda originais (se o delegate existir) para restaurar depois.
  backup.trainingArea = prisma.trainingArea?.findUnique;
  backup.regionFn = prisma.region?.findUnique;
  backup.classCreate = prisma.class?.create;
  backup.assessFindMany = prisma.assessment?.findMany;
  backup.assessCreate = prisma.assessment?.create;

  regionExisted = !!prisma.region;

  prisma.trainingArea.findUnique = async ({ where }) =>
    area && area.id === where.id ? area : null;

  prisma.region = createDelegate(prisma.region, {
    findUnique: async ({ where }) => (region && region.id === where.id ? region : null),
  });

  prisma.class.create = async ({ data, include }) => {
    createdClass = data;
    return {
      id: "class-123",
      ...data,
      trainingArea: area,
      location: region,
    };
  };

  prisma.assessment.findMany = async () => [];
  prisma.assessment.create = async ({ data }) => {
    createdAssessments.push(data);
    return { id: "ass-id", ...data };
  };
}

function restoreStubs() {
  if (backup.trainingArea !== undefined) prisma.trainingArea.findUnique = backup.trainingArea;
  if (backup.classCreate !== undefined) prisma.class.create = backup.classCreate;
  if (backup.assessFindMany !== undefined) prisma.assessment.findMany = backup.assessFindMany;
  if (backup.assessCreate !== undefined) prisma.assessment.create = backup.assessCreate;
  if (regionExisted && backup.regionFn !== undefined) prisma.region.findUnique = backup.regionFn;
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

after(() => restoreStubs());

test("criar turma com sucesso grava startDate e locationId, sem endDate, e cria avaliacoes padrao", async () => {
  installStubs();
  area = { id: "area-1", name: "Cerelharia" };
  region = { id: "reg-1", name: "Luanda" };

  const req = {
    user: { id: "trainer-1" },
    body: {
      name: "Turma A",
      trainingAreaId: "area-1",
      regionId: "reg-1",
      startDate: "2026-09-01",
    },
  };
  const res = mockRes();

  await createClass(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.message, "Turma criada com sucesso");
  assert.equal(res.body.class.id, "class-123");

  assert.equal(createdClass.name, "Turma A");
  assert.equal(createdClass.status, "DRAFT");
  assert.equal(createdClass.trainerId, "trainer-1");
  // o campo do prisma é locationId (referência a Region), preenchido do regionId do body
  assert.equal(createdClass.locationId, "reg-1");
  assert.equal(createdClass.startDate.toISOString(), "2026-09-01T00:00:00.000Z");
  // na criação não deve existir data de término
  assert.equal(Object.prototype.hasOwnProperty.call(createdClass, "endDate"), false);
  // as 4 avaliações padrão são criadas automaticamente
  assert.equal(createdAssessments.length, 4);
});

test("criar turma retorna 404 quando a area nao existe", async () => {
  installStubs();
  area = null;
  region = { id: "reg-1", name: "Luanda" };

  const req = {
    user: { id: "trainer-1" },
    body: { name: "Turma B", trainingAreaId: "inexistente", regionId: "reg-1" },
  };
  const res = mockRes();

  await createClass(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, "Área de formação não encontrada");
});

test("criar turma retorna 404 quando o local/regiao nao existe", async () => {
  installStubs();
  area = { id: "area-1", name: "Cerelharia" };
  region = null;

  const req = {
    user: { id: "trainer-1" },
    body: { name: "Turma C", trainingAreaId: "area-1", regionId: "inexistente" },
  };
  const res = mockRes();

  await createClass(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, "Local/Região não encontrada");
});