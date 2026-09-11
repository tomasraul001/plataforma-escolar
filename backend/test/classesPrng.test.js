import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSecretKey, generateClassCode } from "../src/modules/classes/classes.controller.js";

test("generateSecretKey: formato XXXX-XXXX com chars validos", () => {
  const key = generateSecretKey();
  assert.match(key, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
});

test("generateSecretKey: chars NAO incluem I, O, 0, 1 (ambiguidade visual)", () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < 20; i++) {
    const key = generateSecretKey();
    for (const ch of key) {
      if (ch !== "-") {
        assert.ok(chars.includes(ch), `Char '${ch}' invalido na chave ${key}`);
      }
    }
  }
});

test("generateSecretKey: gera chaves unicas (colisao improvavel em 20 tentativas)", () => {
  const keys = new Set();
  for (let i = 0; i < 20; i++) {
    keys.add(generateSecretKey());
  }
  assert.equal(keys.size, 20);
});

test("generateClassCode: formato PREFIX-YYYY-NNN", () => {
  const code = generateClassCode("Informatica");
  const year = new Date().getFullYear();
  assert.match(code, new RegExp(`^INF-${year}-\\d{3}$`));
});

test("generateClassCode: prefixo uppercase de 3 chars", () => {
  const code = generateClassCode("Mecanica");
  assert.ok(code.startsWith("MEC-"));
});

test("generateClassCode: gera codigos unicos", () => {
  const codes = new Set();
  for (let i = 0; i < 20; i++) {
    codes.add(generateClassCode("Informatica"));
  }
  assert.ok(codes.size > 1, "Deveria gerar pelo menos 2 codigos distintos");
});
