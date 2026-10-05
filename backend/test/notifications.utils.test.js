import { test, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";
import {
  notifyUser,
  notifyUsers,
  notifyEnrollmentStudents,
  notifyUserReplacing,
} from "../src/utils/notifications.js";

// A regra que este ficheiro existe para garantir: uma notificacao falhada
// NUNCA pode fazer falhar a operacao que a originou. Um `throw` a propagar
// aqui transformaria "o sino nao funcionou" em "a nota nao foi lancada".

const backup = {};

function installStubs() {
  backup.notificationCreate = prisma.notification?.create;
  backup.notificationDeleteMany = prisma.notification?.deleteMany;
  backup.enrollmentFindMany = prisma.enrollment?.findMany;

  prisma.notification.create = async () => ({ id: "n-1" });
  prisma.notification.deleteMany = async () => ({ count: 0 });
  prisma.enrollment.findMany = async () => [];
}

function restoreStubs() {
  if (backup.notificationCreate !== undefined) prisma.notification.create = backup.notificationCreate;
  if (backup.notificationDeleteMany !== undefined) prisma.notification.deleteMany = backup.notificationDeleteMany;
  if (backup.enrollmentFindMany !== undefined) prisma.enrollment.findMany = backup.enrollmentFindMany;
}

after(() => restoreStubs());

const payload = {
  type: "grade_updated",
  title: "Nota atualizada",
  body: "Ana em Exame (Informática): 16.",
  link: "/formando/notas?turma=c1",
};

test("notifyUser: cria a notificacao com o payload", async () => {
  installStubs();

  let captured = null;
  prisma.notification.create = async (args) => {
    captured = args.data;
    return { id: "n-1" };
  };

  const result = await notifyUser("ana", payload);

  assert.equal(result.id, "n-1");
  assert.equal(captured.userId, "ana");
  assert.equal(captured.type, "grade_updated");
  assert.equal(captured.link, payload.link);
});

test("notifyUser: erro na BD e engolido e devolve null", async () => {
  installStubs();

  prisma.notification.create = async () => {
    throw new Error("bd em baixo");
  };

  const result = await notifyUser("ana", payload);

  // Nao lancou. Este e o ponto do teste: o caller continua a poder responder 201.
  assert.equal(result, null);
});

test("notifyUser: sem userId nao tenta escrever", async () => {
  installStubs();

  let called = false;
  prisma.notification.create = async () => {
    called = true;
    return { id: "n-1" };
  };

  const result = await notifyUser(null, payload);

  assert.equal(result, null);
  assert.equal(called, false);
});

test("notifyUsers: um destinatario que falha nao leva os outros a falhar", async () => {
  installStubs();

  const attempted = [];
  prisma.notification.create = async ({ data }) => {
    attempted.push(data.userId);
    if (data.userId === "bruno") throw new Error("falhou o bruno");
    return { id: `n-${data.userId}` };
  };

  const results = await notifyUsers(["ana", "bruno", "carla"], payload);

  assert.equal(attempted.length, 3);
  assert.equal(results.filter(Boolean).length, 2);
});

test("notifyUsers: remove duplicados e ignora nulos", async () => {
  installStubs();

  const attempted = [];
  prisma.notification.create = async ({ data }) => {
    attempted.push(data.userId);
    return { id: "n-1" };
  };

  await notifyUsers(["ana", "ana", null, "bruno"], payload);

  assert.deepEqual(attempted, ["ana", "bruno"]);
});

test("notifyEnrollmentStudents: so notifica inscricoes com conta ativa", async () => {
  installStubs();

  let capturedWhere = null;
  prisma.enrollment.findMany = async (args) => {
    capturedWhere = args.where;
    return [{ studentId: "ana" }, { studentId: "bruno" }];
  };

  const created = [];
  prisma.notification.create = async ({ data }) => {
    created.push(data.userId);
    return { id: "n-1" };
  };

  await notifyEnrollmentStudents("c1", payload);

  assert.equal(capturedWhere.classId, "c1");
  assert.equal(capturedWhere.status, "ACTIVE");
  // studentId: { not: null } exclui os alunos adicionados sem conta (manualName).
  assert.deepEqual(capturedWhere.studentId, { not: null });
  assert.deepEqual(created, ["ana", "bruno"]);
});

test("notifyEnrollmentStudents: erro ao buscar inscricoes e engolido", async () => {
  installStubs();

  prisma.enrollment.findMany = async () => {
    throw new Error("bd em baixo");
  };

  const result = await notifyEnrollmentStudents("c1", payload);

  assert.deepEqual(result, []);
});

test("notifyUserReplacing: apaga a nao lida equivalente antes de criar", async () => {
  installStubs();

  const deleted = [];
  prisma.notification.deleteMany = async (args) => {
    deleted.push(args.where);
    return { count: 1 };
  };

  await notifyUserReplacing("ana", payload);

  assert.equal(deleted.length, 1);
  assert.equal(deleted[0].userId, "ana");
  assert.equal(deleted[0].type, "grade_updated");
  assert.equal(deleted[0].link, payload.link);
  // So a nao lida: uma notificacao ja lida e historico do utilizador.
  assert.equal(deleted[0].readAt, null);
});

test("notifyUserReplacing: falha ao apagar nao impede a criacao nova", async () => {
  installStubs();

  prisma.notification.deleteMany = async () => {
    throw new Error("bd em baixo");
  };

  let created = false;
  prisma.notification.create = async () => {
    created = true;
    return { id: "n-1" };
  };

  const result = await notifyUserReplacing("ana", payload);

  assert.equal(created, true);
  assert.equal(result.id, "n-1");
});