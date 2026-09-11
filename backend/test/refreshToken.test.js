import { test, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../src/config/prisma.js";
import { refresh, logout } from "../src/modules/auth/auth.controller.js";

process.env.SECRET_KEY = "segredo-teste";

const storedRefreshTokens = [];
const backup = {};

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function installStubs() {
  backup.refreshTokenFindUnique = prisma.refreshToken?.findUnique;
  backup.refreshTokenCreate = prisma.refreshToken?.create;
  backup.refreshTokenUpdateMany = prisma.refreshToken?.updateMany;
  backup.refreshTokenUpdate = prisma.refreshToken?.update;

  prisma.refreshToken.findUnique = async ({ where }) => {
    return storedRefreshTokens.find((t) => t.tokenHash === where.tokenHash) || null;
  };

  prisma.refreshToken.create = async ({ data }) => {
    storedRefreshTokens.push({ id: `rt-${storedRefreshTokens.length + 1}`, ...data });
    return storedRefreshTokens[storedRefreshTokens.length - 1];
  };

  prisma.refreshToken.updateMany = async ({ where, data }) => {
    let count = 0;
    for (const t of storedRefreshTokens) {
      if (where.userId && t.userId === where.userId && !t.revokedAt) {
        Object.assign(t, data);
        count++;
      }
    }
    return { count };
  };

  prisma.refreshToken.update = async ({ where, data }) => {
    const token = storedRefreshTokens.find((t) => t.id === where.id);
    if (token) Object.assign(token, data);
    return token || {};
  };
}

function restoreStubs() {
  if (backup.refreshTokenFindUnique !== undefined) prisma.refreshToken.findUnique = backup.refreshTokenFindUnique;
  if (backup.refreshTokenCreate !== undefined) prisma.refreshToken.create = backup.refreshTokenCreate;
  if (backup.refreshTokenUpdateMany !== undefined) prisma.refreshToken.updateMany = backup.refreshTokenUpdateMany;
  if (backup.refreshTokenUpdate !== undefined) prisma.refreshToken.update = backup.refreshTokenUpdate;
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
  storedRefreshTokens.length = 0;
}

function createStoredToken(overrides = {}) {
  const token = crypto.randomBytes(48).toString("hex");
  const record = {
    id: `rt-${storedRefreshTokens.length + 1}`,
    tokenHash: hashToken(token),
    userId: "user-123",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    createdAt: new Date(),
    user: { id: "user-123", name: "João", email: "joao@email.com", role: "formador" },
    ...overrides,
  };
  storedRefreshTokens.push(record);
  return { raw: token, record };
}

after(() => restoreStubs());

test("refresh: retorna 401 quando nao envia token", async () => {
  installStubs();
  resetState();

  const req = { body: {} };
  const res = mockRes();

  await refresh(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Refresh token obrigatório!");
});

test("refresh: retorna 401 quando token invalido", async () => {
  installStubs();
  resetState();

  const req = { body: { refreshToken: "token-invalido" } };
  const res = mockRes();

  await refresh(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Refresh token inválido!");
});

test("refresh: retorna 401 quando token foi revogado", async () => {
  installStubs();
  resetState();
  const { raw } = createStoredToken({ revokedAt: new Date() });

  const req = { body: { refreshToken: raw } };
  const res = mockRes();

  await refresh(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Refresh token revogado!");
});

test("refresh: retorna 401 quando token expirado", async () => {
  installStubs();
  resetState();
  const { raw } = createStoredToken({ expiresAt: new Date(Date.now() - 1000) });

  const req = { body: { refreshToken: raw } };
  const res = mockRes();

  await refresh(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Refresh token expirado!");
});

test("refresh: rotaciona tokens com sucesso", async () => {
  installStubs();
  resetState();
  const { raw } = createStoredToken();

  const req = { body: { refreshToken: raw } };
  const res = mockRes();

  await refresh(req, res);

  assert.equal(res.statusCode, 200);
  assert.ok(res.body.token);
  assert.ok(res.body.refreshToken);
  assert.notEqual(res.body.refreshToken, raw);
  assert.equal(res.body.role, "formador");
  assert.equal(res.body.name, "João");
  assert.equal(res.body.id, "user-123");

  const decoded = jwt.verify(res.body.token, process.env.SECRET_KEY);
  assert.equal(decoded.id, "user-123");
});

test("refresh: revoga todas as sessoes quando detecta reuso de token revogado", async () => {
  installStubs();
  resetState();
  const { raw } = createStoredToken({ revokedAt: new Date() });

  const req = { body: { refreshToken: raw } };
  const res = mockRes();

  await refresh(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Refresh token revogado!");
  assert.ok(storedRefreshTokens.every((t) => t.revokedAt !== null));
});

test("logout: revoga token e retorna 200", async () => {
  installStubs();
  resetState();
  const { raw } = createStoredToken();

  const req = { body: { refreshToken: raw } };
  const res = mockRes();

  await logout(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, "Logout realizado!");
  const revoked = storedRefreshTokens.find((t) => t.tokenHash === hashToken(raw));
  assert.ok(revoked.revokedAt);
});

test("logout: retorna 200 mesmo sem token (idempotente)", async () => {
  installStubs();
  resetState();

  const req = { body: {} };
  const res = mockRes();

  await logout(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, "Logout realizado!");
});
