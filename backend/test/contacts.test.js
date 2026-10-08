import { test, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";
import { getContacts } from "../src/modules/users/users.controller.js";

const CONTACT_SELECT = { id: true, name: true, email: true, phone: true, role: true };

let userFindManyCalls = [];
let classFindManyCalls = [];
let userFindManyResults = [];
let classFindManyResult = [];

const backup = {};

function installStubs() {
  backup.userFindMany = prisma.user?.findMany;
  backup.classFindMany = prisma.class?.findMany;

  prisma.user.findMany = async (args) => {
    userFindManyCalls.push(args);
    return userFindManyResults[userFindManyCalls.length - 1] ?? [];
  };

  prisma.class.findMany = async (args) => {
    classFindManyCalls.push(args);
    return classFindManyResult;
  };
}

function restoreStubs() {
  if (backup.userFindMany !== undefined) prisma.user.findMany = backup.userFindMany;
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
  userFindManyCalls = [];
  classFindManyCalls = [];
  userFindManyResults = [];
  classFindManyResult = [];
}

const coord = { user: { id: "coord-1", role: "coordenador" } };
const sec = { user: { id: "sec-1", role: "secretaria" } };
const trainer = { user: { id: "form-1", role: "formador" } };

after(() => restoreStubs());

test("contactos: coordenador ve toda a lista (inclui coordenadores e secretaria)", async () => {
  installStubs();
  resetState();
  userFindManyResults = [
    [
      { id: "coord-1", name: "Coord", email: "coord@x.com", phone: "911", role: "coordenador" },
      { id: "sec-1", name: "Sec", email: "sec@x.com", phone: "922", role: "secretaria" },
    ],
  ];

  const res = mockRes();
  await getContacts(coord, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 2);
  // where vazio = todos os papéis, sem filtro de role
  assert.deepEqual(userFindManyCalls[0].where, {});
  assert.deepEqual(userFindManyCalls[0].select, CONTACT_SELECT);
  assert.equal(userFindManyCalls[0].select.password, undefined);
});

test("contactos: secretaria tem exatamente o mesmo acesso do coordenador", async () => {
  installStubs();
  resetState();
  userFindManyResults = [
    [
      { id: "coord-1", name: "Coord", email: "coord@x.com", phone: "911", role: "coordenador" },
      { id: "aluno-1", name: "Aluno", email: "aluno@x.com", phone: null, role: "formando" },
    ],
  ];

  const res = mockRes();
  await getContacts(sec, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 2);
  assert.deepEqual(userFindManyCalls[0].where, {});
  // uma unica consulta (sem queries de turmas)
  assert.equal(classFindManyCalls.length, 0);
  assert.equal(userFindManyCalls.length, 1);
});

test("contactos: formador ve so formandos ACTIVE das suas turmas", async () => {
  installStubs();
  resetState();
  userFindManyResults = [
    [{ id: "aluno-1", name: "Aluno A", email: "a@x.com", phone: "933", role: "formando" }],
    [],
  ];

  const res = mockRes();
  await getContacts(trainer, res);

  assert.equal(res.statusCode, 200);
  const formandosQuery = userFindManyCalls[0];
  assert.deepEqual(formandosQuery.where, {
    role: "formando",
    enrollments: {
      some: {
        class: { trainerId: "form-1" },
        status: "ACTIVE",
      },
    },
  });
  assert.deepEqual(formandosQuery.select, CONTACT_SELECT);
});

test("contactos: formador busca formadores com turma OPEN/CLOSED nas regioes das suas turmas", async () => {
  installStubs();
  resetState();
  classFindManyResult = [
    { locationId: "reg-1" },
    { locationId: "reg-1" },
    { locationId: "reg-2" },
    { locationId: null },
  ];
  userFindManyResults = [
    [],
    [{ id: "form-2", name: "Formador B", email: "b@x.com", phone: "944", role: "formador" }],
  ];

  const res = mockRes();
  await getContacts(trainer, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].id, "form-2");

  // regioes distintas, sem nulos
  assert.deepEqual(classFindManyCalls[0].where, { trainerId: "form-1" });
  const formadoresQuery = userFindManyCalls[1];
  assert.deepEqual(formadoresQuery.where, {
    role: "formador",
    id: { not: "form-1" },
    classes: {
      some: {
        locationId: { in: ["reg-1", "reg-2"] },
        status: { in: ["OPEN", "CLOSED"] },
      },
    },
  });
  assert.deepEqual(formadoresQuery.select, CONTACT_SELECT);
});

test("contactos: formador sem turmas nao rebenta e devolve so o que ha nas outras queries", async () => {
  installStubs();
  resetState();
  classFindManyResult = [];
  userFindManyResults = [
    [{ id: "aluno-1", name: "Aluno", email: "a@x.com", phone: null, role: "formando" }],
    [],
  ];

  const res = mockRes();
  await getContacts(trainer, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].id, "aluno-1");
  // sem regioes => in: [] (Prisma devolve vazio; nao deve lancar)
  assert.deepEqual(userFindManyCalls[1].where.classes.some.locationId, { in: [] });
});

test("contactos: formador recebe formandos e formadores na mesma resposta", async () => {
  installStubs();
  resetState();
  classFindManyResult = [{ locationId: "reg-1" }];
  userFindManyResults = [
    [{ id: "aluno-1", name: "Aluno", email: "a@x.com", phone: "933", role: "formando" }],
    [{ id: "form-2", name: "Formador B", email: "b@x.com", phone: "944", role: "formador" }],
  ];

  const res = mockRes();
  await getContacts(trainer, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(
    res.body.map((u) => u.role),
    ["formando", "formador"]
  );
});

test("contactos: papel sem permissao recebe 403 Acesso negado e nao consulta o banco", async () => {
  installStubs();
  resetState();

  const req = { user: { id: "aluno-1", role: "formando" } };
  const res = mockRes();

  await getContacts(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, "Acesso negado");
  assert.equal(userFindManyCalls.length, 0);
  assert.equal(classFindManyCalls.length, 0);
});