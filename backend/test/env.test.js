import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEnv, parseTrustProxy, trustProxySetting } from "../src/config/env.js";

// Zero deps: importa so config/env.js (roda sem prisma generate).

function withEnv(overrides, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(overrides)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("validateEnv: sem DATABASE_URL chama exit(1)", () => {
  withEnv({ DATABASE_URL: undefined }, () => {
    let exitCode = null;
    const result = validateEnv((code) => {
      exitCode = code;
    });
    assert.equal(exitCode, 1, "tem de sair com codigo 1");
    assert.equal(result.ok, false);
    assert.ok(result.criticas.includes("DATABASE_URL"));
  });
});

test("validateEnv: sem SECRET_KEY chama exit(1)", () => {
  withEnv({ SECRET_KEY: undefined }, () => {
    let exitCode = null;
    const result = validateEnv((code) => {
      exitCode = code;
    });
    assert.equal(exitCode, 1);
    assert.ok(result.criticas.includes("SECRET_KEY"));
  });
});

test("validateEnv: criticas presentes nao chama exit mesmo sem chaves de acesso", () => {
  withEnv(
    { DATABASE_URL: "postgresql://x", SECRET_KEY: "segredo", COORDENADOR_KEY: undefined },
    () => {
      let exitCode = null;
      const result = validateEnv((code) => {
        exitCode = code;
      });
      // Chaves de acesso em falta sao aviso (registo quebra), nao fatal
      assert.equal(exitCode, null);
      assert.equal(result.ok, false);
      assert.ok(result.chavesAcesso.includes("COORDENADOR_KEY"));
      assert.deepEqual(result.criticas, []);
    },
  );
});

test("validateEnv: tudo definido -> ok e sem exit", () => {
  withEnv(
    {
      DATABASE_URL: "postgresql://x",
      SECRET_KEY: "segredo",
      COORDENADOR_KEY: "a",
      FORMADOR_KEY: "b",
      FORMANDO_KEY: "c",
      SECRETARIA_KEY: "d",
    },
    () => {
      let exitCode = null;
      const result = validateEnv((code) => {
        exitCode = code;
      });
      assert.equal(exitCode, null);
      assert.equal(result.ok, true);
    },
  );
});

test("parseTrustProxy: interpretacao dos valores", () => {
  assert.equal(parseTrustProxy(undefined), null);
  assert.equal(parseTrustProxy(null), null);
  assert.equal(parseTrustProxy(""), null);
  assert.equal(parseTrustProxy("   "), null);
  assert.equal(parseTrustProxy("true"), 1);
  assert.equal(parseTrustProxy("TRUE"), 1);
  assert.equal(parseTrustProxy("false"), false);
  assert.equal(parseTrustProxy("0"), false);
  assert.equal(parseTrustProxy("2"), 2);
  assert.equal(parseTrustProxy(" 3 "), 3);
  assert.equal(parseTrustProxy("-1"), false, "inteiro nao positivo nao confia");
  assert.equal(parseTrustProxy("abc"), false, "lixo nao confia");
  assert.equal(parseTrustProxy("1.5"), false, "so inteiros");
});

test("trustProxySetting: TRUST_PROXY explicito ganha aos markers", () => {
  assert.equal(trustProxySetting({ TRUST_PROXY: "false", RAILWAY_PUBLIC_DOMAIN: "x" }), false);
  assert.equal(trustProxySetting({ TRUST_PROXY: "2" }), 2);
});

test("trustProxySetting: sem TRUST_PROXY usa markers Railway, senao false", () => {
  assert.equal(trustProxySetting({ RAILWAY_PUBLIC_DOMAIN: "x.up.railway.app" }), 1);
  assert.equal(trustProxySetting({ RAILWAY_ENVIRONMENT: "production" }), 1);
  assert.equal(trustProxySetting({}), false, "deploy direto nao confia no XFF");
});
