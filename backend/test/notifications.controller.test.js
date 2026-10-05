import { test, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/prisma.js";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  clearRead,
} from "../src/modules/notifications/notifications.controller.js";

// Tests do isolation por userId. O risco aqui nao e o SQL, e o `where`: se o
// `userId` deixar de estar preso ao req.user.id, qualquer utilizador le e
// marca como lida as notificacoes de todos os outros (IDOR).

const backup = {};

function installStubs() {
  backup.notificationFindMany = prisma.notification?.findMany;
  backup.notificationCount = prisma.notification?.count;
  backup.notificationUpdateMany = prisma.notification?.updateMany;
  backup.notificationDeleteMany = prisma.notification?.deleteMany;

  prisma.notification.findMany = async () => [];
  prisma.notification.count = async () => 0;
  prisma.notification.updateMany = async () => ({ count: 0 });
  prisma.notification.deleteMany = async () => ({ count: 0 });
}

function restoreStubs() {
  if (backup.notificationFindMany !== undefined) prisma.notification.findMany = backup.notificationFindMany;
  if (backup.notificationCount !== undefined) prisma.notification.count = backup.notificationCount;
  if (backup.notificationUpdateMany !== undefined) prisma.notification.updateMany = backup.notificationUpdateMany;
  if (backup.notificationDeleteMany !== undefined) prisma.notification.deleteMany = backup.notificationDeleteMany;
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

const ana = { id: "ana", role: "formando", name: "Ana" };
const bruno = { id: "bruno", role: "formando", name: "Bruno" };

test("listNotifications: consulta apenas as notificacoes do proprio utilizador", async () => {
  installStubs();

  let capturedWhere = null;
  prisma.notification.findMany = async (args) => {
    capturedWhere = args.where;
    return [];
  };

  const res = mockRes();
  await listNotifications({ query: {}, user: ana }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(capturedWhere.userId, "ana");
});

test("listNotifications: unread=true filtra as nao lidas", async () => {
  installStubs();

  let capturedWhere = null;
  prisma.notification.findMany = async (args) => {
    capturedWhere = args.where;
    return [];
  };

  const res = mockRes();
  await listNotifications({ query: { unread: "true" }, user: ana }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(capturedWhere.userId, "ana");
  assert.equal(capturedWhere.readAt, null);
});

test("listNotifications: nao aceita userId do query para ler as de outro", async () => {
  installStubs();

  let capturedWhere = null;
  prisma.notification.findMany = async (args) => {
    capturedWhere = args.where;
    return [];
  };

  const res = mockRes();
  // Tentativa de IDOR: passar ?userId=bruno tem de ser ignorado.
  await listNotifications({ query: { userId: "bruno" }, user: ana }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(capturedWhere.userId, "ana");
  assert.notEqual(capturedWhere.userId, "bruno");
});

test("listNotifications: limit fica dentro dos limites do servidor", async () => {
  installStubs();

  let capturedTake = null;
  prisma.notification.findMany = async (args) => {
    capturedTake = args.take;
    return [];
  };

  const res = mockRes();
  await listNotifications({ query: { limit: "99999" }, user: ana }, res);

  assert.equal(capturedTake, 100);
});

test("getUnreadCount: conta so as do proprio e nao lidas", async () => {
  installStubs();

  let capturedWhere = null;
  prisma.notification.count = async (args) => {
    capturedWhere = args.where;
    return 3;
  };

  const res = mockRes();
  await getUnreadCount({ user: ana }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.count, 3);
  assert.equal(capturedWhere.userId, "ana");
  assert.equal(capturedWhere.readAt, null);
});

test("markAsRead: notificacao de outro utilizador devolve 404", async () => {
  installStubs();

  // updateMany devolve count 0 = nada foi atualizado. Acontece quando a
  // notificacao nao e da Ana (ou ja estava lida). E um 404, nao um 200: nao
  // damos a confirmar que aquele id existe na conta de outra pessoa.
  prisma.notification.updateMany = async () => ({ count: 0 });

  const res = mockRes();
  await markAsRead({ params: { id: "n-bruno" }, user: ana }, res);

  assert.equal(res.statusCode, 404);
});

test("markAsRead: atualiza so notificacoes do proprio utilizador", async () => {
  installStubs();

  let capturedWhere = null;
  prisma.notification.updateMany = async (args) => {
    capturedWhere = args.where;
    return { count: 1 };
  };
  prisma.notification.count = async () => 2;

  const res = mockRes();
  await markAsRead({ params: { id: "n-1" }, user: ana }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(capturedWhere.id, "n-1");
  assert.equal(capturedWhere.userId, "ana");
  assert.equal(capturedWhere.readAt, null);
  assert.ok(res.body.readAt === undefined);
});

test("markAllAsRead: aplica-se ao proprio utilizador", async () => {
  installStubs();

  let capturedWhere = null;
  prisma.notification.updateMany = async (args) => {
    capturedWhere = args.where;
    return { count: 5 };
  };

  const res = mockRes();
  await markAllAsRead({ user: bruno }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.count, 5);
  assert.equal(capturedWhere.userId, "bruno");
  assert.equal(capturedWhere.readAt, null);
});

test("clearRead: apaga so as lidas, nunca as por ler", async () => {
  installStubs();

  let capturedWhere = null;
  prisma.notification.deleteMany = async (args) => {
    capturedWhere = args.where;
    return { count: 4 };
  };

  const res = mockRes();
  await clearRead({ user: ana }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.count, 4);
  assert.equal(capturedWhere.userId, "ana");
  // Sem este filtro, o botao seria um "apagar tudo" disfarçado.
  assert.deepEqual(capturedWhere.readAt, { not: null });
});