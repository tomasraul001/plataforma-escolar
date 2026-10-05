import { test, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";
import {
  createSession,
  listSessions,
  getSession,
  bulkUpdateRecords,
  getSummary,
  getMyAttendance,
} from "../src/modules/attendance/attendance.controller.js";

const backup = {};

function installStubs() {
  backup.classFindUnique = prisma.class?.findUnique;
  backup.attendanceSessionFindFirst = prisma.attendanceSession?.findFirst;
  backup.enrollmentFindMany = prisma.enrollment?.findMany;
  backup.attendanceRecordFindMany = prisma.attendanceRecord?.findMany;
  backup.attendanceRecordUpdateMany = prisma.attendanceRecord?.updateMany;
  backup.attendanceRecordCreateMany = prisma.attendanceRecord?.createMany;
  backup.transaction = prisma.$transaction;

  prisma.class.findUnique = async () => null;
  prisma.attendanceSession.findFirst = async () => null;
  // getSession e bulkUpdateRecords consultam as inscricoes ativas da turma
  prisma.enrollment.findMany = async () => [];
  prisma.attendanceRecord.findMany = async () => [];
  prisma.attendanceRecord.updateMany = async () => ({ count: 0 });
  prisma.attendanceRecord.createMany = async () => ({ count: 0 });
  // O controller usa $transaction(callback) e $transaction([...promessas]);
  // o stub tem de suportar as duas formas.
  prisma.$transaction = async (arg) => {
    if (typeof arg === "function") return arg(prisma);
    return Promise.all(arg);
  };
}

function restoreStubs() {
  if (backup.classFindUnique !== undefined) prisma.class.findUnique = backup.classFindUnique;
  if (backup.attendanceSessionFindFirst !== undefined) prisma.attendanceSession.findFirst = backup.attendanceSessionFindFirst;
  if (backup.enrollmentFindMany !== undefined) prisma.enrollment.findMany = backup.enrollmentFindMany;
  if (backup.attendanceRecordFindMany !== undefined) prisma.attendanceRecord.findMany = backup.attendanceRecordFindMany;
  if (backup.attendanceRecordUpdateMany !== undefined) prisma.attendanceRecord.updateMany = backup.attendanceRecordUpdateMany;
  if (backup.attendanceRecordCreateMany !== undefined) prisma.attendanceRecord.createMany = backup.attendanceRecordCreateMany;
  if (backup.transaction !== undefined) prisma.$transaction = backup.transaction;
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

const foreignClass = () => ({ id: "c1", trainerId: "trainer-1", status: "OPEN" });
const anotherTrainer = { id: "trainer-2", role: "formador" };

after(() => restoreStubs());

const ownerTrainer = { id: "trainer-1", role: "formador" };

test("createSession: formador de outra turma recebe 403 (IDOR)", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();

  const req = {
    params: { classId: "c1" },
    body: { theme: "Introdução" },
    user: anotherTrainer,
  };
  const res = mockRes();

  await createSession(req, res);

  assert.equal(res.statusCode, 403);
});

test("createSession: formador dono da turma passa da validacao de tema", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();

  const req = {
    params: { classId: "c1" },
    body: { theme: "Introdução" },
    user: ownerTrainer,
  };
  const res = mockRes();

  await createSession(req, res);

  // Sem o stub de attendanceSession.create a transacao falha, o que prova
  // que passou dos guards 400/403 e chegou a tries de criar a sessao.
  assert.notEqual(res.statusCode, 400);
  assert.notEqual(res.statusCode, 403);
});

test("listSessions: formador de outra turma recebe 403 (IDOR)", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();

  const req = { params: { classId: "c1" }, user: anotherTrainer };
  const res = mockRes();

  await listSessions(req, res);

  assert.equal(res.statusCode, 403);
});

test("getSession: formador de outra turma recebe 403 (IDOR)", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();

  const req = { params: { classId: "c1", sessionId: "s1" }, user: anotherTrainer };
  const res = mockRes();

  await getSession(req, res);

  assert.equal(res.statusCode, 403);
});

test("bulkUpdateRecords: formador de outra turma recebe 403 (IDOR)", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();

  const req = { params: { classId: "c1", sessionId: "s1" }, body: { records: [] }, user: anotherTrainer };
  const res = mockRes();

  await bulkUpdateRecords(req, res);

  assert.equal(res.statusCode, 403);
});

test("getSummary: formador de outra turma recebe 403 (IDOR)", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();

  const req = { params: { classId: "c1" }, user: anotherTrainer };
  const res = mockRes();

  await getSummary(req, res);

  assert.equal(res.statusCode, 403);
});

test("getSession: coordenador tem acesso a qualquer turma", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();
  prisma.attendanceSession.findFirst = async () => ({ id: "s1", date: new Date(), records: [] });

  const req = { params: { classId: "c1", sessionId: "s1" }, user: { id: "coord-1", role: "coordenador" } };
  const res = mockRes();

  await getSession(req, res);

  assert.equal(res.statusCode, 200);
});

test("bulkUpdateRecords: inscricao de outra turma e rejeitada com 400 (IDOR)", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();
  prisma.attendanceSession.findFirst = async () => ({ id: "s1" });
  // So "e-desta" pertence a esta turma; "e-de-outra" e de outra turma
  prisma.enrollment.findMany = async () => [{ id: "e-desta" }];

  let transactionCalled = false;
  prisma.$transaction = async (arg) => {
    transactionCalled = true;
    return typeof arg === "function" ? arg(prisma) : Promise.all(arg);
  };

  const req = {
    params: { classId: "c1", sessionId: "s1" },
    body: {
      records: [
        { enrollmentId: "e-desta", present: true },
        { enrollmentId: "e-de-outra", present: false },
      ],
    },
    user: ownerTrainer,
  };
  const res = mockRes();

  await bulkUpdateRecords(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Inscrição não pertence a esta turma");
  assert.equal(transactionCalled, false, "não deve escrever nada quando há inscrição inválida");
});

test("bulkUpdateRecords: inscricao inexistente ou vazia e rejeitada com 400", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();
  prisma.attendanceSession.findFirst = async () => ({ id: "s1" });

  const req = {
    params: { classId: "c1", sessionId: "s1" },
    body: { records: [{ enrollmentId: "", present: true }] },
    user: ownerTrainer,
  };
  const res = mockRes();

  await bulkUpdateRecords(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Inscrição inválida");
});

test("bulkUpdateRecords: inscricoes validas passam a validacao e abrem transacao", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();
  prisma.attendanceSession.findFirst = async () => ({ id: "s1" });
  prisma.enrollment.findMany = async () => [{ id: "e-1" }, { id: "e-2" }];
  prisma.attendanceRecord.findMany = async () => [{ enrollmentId: "e-1" }];

  const created = [];
  prisma.$transaction = async (arg) =>
    typeof arg === "function" ? arg(prisma) : Promise.all(arg);
  prisma.attendanceRecord.updateMany = async () => ({ count: 1 });
  prisma.attendanceRecord.createMany = async ({ data }) => {
    created.push(...data);
    return { count: data.length };
  };

  const req = {
    params: { classId: "c1", sessionId: "s1" },
    body: {
      records: [
        { enrollmentId: "e-1", present: false },
        { enrollmentId: "e-2", present: true },
      ],
    },
    user: ownerTrainer,
  };
  const res = mockRes();

  await bulkUpdateRecords(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(created, [{ sessionId: "s1", enrollmentId: "e-2", present: true }]);
});

test("bulkUpdateRecords: turma arquivada bloqueia a escrita de presencas", async () => {
  installStubs();
  prisma.class.findUnique = async () => ({ id: "c1", trainerId: "trainer-1", status: "ARCHIVED" });

  const req = {
    params: { classId: "c1", sessionId: "s1" },
    body: { records: [] },
    user: ownerTrainer,
  };
  const res = mockRes();

  await bulkUpdateRecords(req, res);

  assert.equal(res.statusCode, 400);
});

// O stub de $transaction passa `prisma` como `tx`, por isso tx.$transaction
// existe e a chamada aninhada nunca falhava nos testes. Contra a BD real o
// cliente transacional nao tem $transaction e o PATCH devolvia 500. Este stub
// reproduz o cliente real: sem $transaction no `tx`.
test("bulkUpdateRecords: nao aninha $transaction dentro da transacao", async () => {
  installStubs();
  prisma.class.findUnique = async () => foreignClass();
  prisma.attendanceSession.findFirst = async () => ({ id: "s1" });
  prisma.enrollment.findMany = async () => [{ id: "e-1" }, { id: "e-2" }];
  prisma.attendanceRecord.findMany = async () => [{ enrollmentId: "e-1" }, { enrollmentId: "e-2" }];

  const updated = [];
  prisma.attendanceRecord.updateMany = async ({ where, data }) => {
    updated.push({ enrollmentId: where.enrollmentId, present: data.present });
    return { count: 1 };
  };

  // tx sem $transaction, como o Prisma faz em producao.
  const tx = {
    attendanceRecord: prisma.attendanceRecord,
    enrollment: prisma.enrollment,
    attendanceSession: prisma.attendanceSession,
  };
  prisma.$transaction = async (arg) => arg(tx);

  const req = {
    params: { classId: "c1", sessionId: "s1" },
    body: {
      records: [
        { enrollmentId: "e-1", present: false },
        { enrollmentId: "e-2", present: true },
      ],
    },
    user: ownerTrainer,
  };
  const res = mockRes();

  await bulkUpdateRecords(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updated.length, 2);
  assert.ok(updated.some((u) => u.enrollmentId === "e-1" && u.present === false));
  assert.ok(updated.some((u) => u.enrollmentId === "e-2" && u.present === true));
});

// --- getSummary: perStudent e frequencia por aluno ---

const openClass = () => ({ id: "c1", code: "INF-1", name: "Informática", trainerId: "trainer-1", status: "OPEN" });

// Os stubs devolvem o registo inteiro, incluindo enrollmentId. Mas o teste
// stubado nao garante o `select` do controller, e essa select tem de trazer o
// enrollmentId: e com ele que se agrupa a frequencia por aluno. Ha um teste
// em baixo que verifica exatamente isso, porque o bug passou despercebido aqui
// e so apareceu contra a base de dados real.
//
// Tres sessoes. O e-1 tem registo em todas; o e-2 entrou a meio; o e-3 depois.
const threeSessions = () => [
  { id: "s1", date: new Date(), records: [{ enrollmentId: "e-1", present: true }, { enrollmentId: "e-2", present: true }] },
  { id: "s2", date: new Date(), records: [{ enrollmentId: "e-1", present: false }, { enrollmentId: "e-2", present: false }] },
  { id: "s3", date: new Date(), records: [{ enrollmentId: "e-1", present: true }] },
];

const threeEnrollments = () => [
  { id: "e-1", studentId: "u-1", manualName: null, student: { id: "u-1", name: "Ana" } },
  { id: "e-2", studentId: "u-2", manualName: null, student: { id: "u-2", name: "Bruno" } },
  { id: "e-3", studentId: null, manualName: "Carlos", student: null },
];

test("getSummary: perStudent devolve percentage e status por aluno", async () => {
  installStubs();
  prisma.class.findUnique = async () => openClass();
  prisma.attendanceSession.findMany = async () => threeSessions();
  prisma.enrollment.findMany = async () => threeEnrollments();

  const req = { params: { classId: "c1" }, user: ownerTrainer };
  const res = mockRes();

  await getSummary(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.perStudent.length, 3);

  const ana = res.body.perStudent.find((s) => s.enrollmentId === "e-1");
  // Ana presente em 2 de 3 sessoes -> 67% -> abaixo do minimo (warning).
  assert.equal(ana.present, 2);
  assert.equal(ana.totalSessions, 3);
  assert.equal(ana.percentage, 67);
  assert.equal(ana.status, "warning");
  assert.equal(ana.awaitingSessions, false);

  assert.equal(res.body.belowMinimum, 2);
});

test("getSummary: aluno que entrou a meio nao fica com 100% falso", async () => {
  installStubs();
  prisma.class.findUnique = async () => openClass();
  prisma.attendanceSession.findMany = async () => threeSessions();
  prisma.enrollment.findMany = async () => threeEnrollments();

  const req = { params: { classId: "c1" }, user: ownerTrainer };
  const res = mockRes();

  await getSummary(req, res);

  const bruno = res.body.perStudent.find((s) => s.enrollmentId === "e-2");
  // Bruno entrou depois da s1: tem registo em s1 (presente) e s2 (faltou), e
  // nenhum na s3. O denominador e 2, o numero de sessoes em que teve registo,
  // e nao 3. Com o denominador errado seria 1/2 = 50% em qualquer das ordens,
  // mas o teste que importa e o de baixo.
  assert.equal(bruno.present, 1);
  assert.equal(bruno.totalSessions, 2);
  assert.equal(bruno.percentage, 50);
  assert.equal(bruno.status, "warning");

  // O denominador errado daria 100% se se usasse o numero de registos como
  // total e se contassem so as presencas. Com um aluno que falhou a unica
  // sessao a que assistiu, a resposta tem de ser 0%.
  prisma.attendanceSession.findMany = async () => [
    { id: "s1", date: new Date(), records: [{ enrollmentId: "e-1", present: true }] },
    { id: "s2", date: new Date(), records: [{ enrollmentId: "e-1", present: true }, { enrollmentId: "e-2", present: false }] },
  ];

  const res2 = mockRes();
  await getSummary({ params: { classId: "c1" }, user: ownerTrainer }, res2);

  const bruno2 = res2.body.perStudent.find((s) => s.enrollmentId === "e-2");
  assert.equal(bruno2.present, 0);
  assert.equal(bruno2.totalSessions, 1);
  assert.equal(bruno2.percentage, 0);
  assert.equal(bruno2.status, "critical");
});

test("getSummary: aluno inscrito depois das sessoes fica awaitingSessions", async () => {
  installStubs();
  prisma.class.findUnique = async () => openClass();
  prisma.attendanceSession.findMany = async () => threeSessions();
  prisma.enrollment.findMany = async () => threeEnrollments();

  const req = { params: { classId: "c1" }, user: ownerTrainer };
  const res = mockRes();

  await getSummary(req, res);

  // Carlos foi adicionado depois das tres sessoes: nao tem registo nenhum, logo
  // nao entra na contagem de abaixo do minimo.
  const carlos = res.body.perStudent.find((s) => s.enrollmentId === "e-3");
  assert.equal(carlos.awaitingSessions, true);
  assert.equal(carlos.totalSessions, 0);
  assert.equal(carlos.percentage, 0);
  assert.equal(carlos.name, "Carlos");
  assert.equal(res.body.belowMinimum, 2);
});

test("getSummary: pede enrollmentId nos registos para poder agrupar por aluno", async () => {
  installStubs();
  prisma.class.findUnique = async () => openClass();
  prisma.enrollment.findMany = async () => threeEnrollments();

  let capturedSelect = null;
  prisma.attendanceSession.findMany = async (args) => {
    capturedSelect = args.include?.records?.select;
    // Reproduz o que o Prisma devolve de facto: so os campos pedidos. Sem
    // enrollmentId no select, record.enrollmentId chega undefined, o agrupamento
    // por aluno nunca acontece e todos saem como awaitingSessions com 0%.
    return args.include.records.select.enrollmentId
      ? threeSessions()
      : threeSessions().map((s) => ({
          ...s,
          records: s.records.map((r) => ({ present: r.present })),
        }));
  };

  const res = mockRes();
  await getSummary({ params: { classId: "c1" }, user: ownerTrainer }, res);

  assert.ok(capturedSelect?.enrollmentId, "o select tem de trazer enrollmentId");

  const ana = res.body.perStudent.find((s) => s.enrollmentId === "e-1");
  assert.equal(ana.awaitingSessions, false);
  assert.equal(ana.totalSessions, 3);
  assert.equal(ana.percentage, 67);
  assert.equal(ana.status, "warning");
});

test("getSummary: percentual e calculado sobre as sessoes, nao sobre os registos", async () => {
  installStubs();
  prisma.class.findUnique = async () => openClass();
  // Uma sessao com tres registos presentes, dos quais um e de um aluno que
  // ja nao conta (DROPPED, filtrado em activeEnrollments).
  prisma.attendanceSession.findMany = async () => [
    { id: "s1", date: new Date(), records: [{ enrollmentId: "e-1", present: true }, { enrollmentId: "e-2", present: true }, { enrollmentId: "e-old", present: true }] },
  ];
  prisma.enrollment.findMany = async () => threeEnrollments();

  const req = { params: { classId: "c1" }, user: ownerTrainer };
  const res = mockRes();

  await getSummary(req, res);

  const ana = res.body.perStudent.find((s) => s.enrollmentId === "e-1");
  assert.equal(ana.totalSessions, 1);
  assert.equal(ana.percentage, 100);
  assert.equal(ana.status, "ok");
});

test("getSummary: turma sem sessoes devolve perStudent vazio e nao divide por zero", async () => {
  installStubs();
  prisma.class.findUnique = async () => openClass();
  prisma.attendanceSession.findMany = async () => [];
  prisma.enrollment.findMany = async () => threeEnrollments();

  const req = { params: { classId: "c1" }, user: ownerTrainer };
  const res = mockRes();

  await getSummary(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.totalSessions, 0);
  assert.equal(res.body.belowMinimum, 0);
  for (const s of res.body.perStudent) {
    assert.equal(s.percentage, 0);
    assert.equal(s.awaitingSessions, true);
  }
});

test("getMyAttendance: devolve status calculado pelo backend", async () => {
  installStubs();
  prisma.attendanceRecord.findMany = async () => [
    { present: true, enrollment: { class: { id: "c1", name: "Informática", code: "INF-1" } } },
    { present: true, enrollment: { class: { id: "c1", name: "Informática", code: "INF-1" } } },
    { present: false, enrollment: { class: { id: "c1", name: "Informática", code: "INF-1" } } },
    { present: false, enrollment: { class: { id: "c1", name: "Informática", code: "INF-1" } } },
  ];

  const req = { params: {}, query: {}, user: { id: "u-1", role: "formando" } };
  const res = mockRes();

  await getMyAttendance(req, res);

  assert.equal(res.statusCode, 200);
  // 2 de 4 = 50%, abaixo do minimo de 75 mas acima do critical.
  assert.equal(res.body[0].percentage, 50);
  assert.equal(res.body[0].status, "warning");
});