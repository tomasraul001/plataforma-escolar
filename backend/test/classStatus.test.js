import { test } from "node:test";
import assert from "node:assert/strict";
import { isLocked, lockedMessage, LOCKED_STATUSES } from "../src/utils/classStatus.js";

test("isLocked: turmas fechadas e arquivadas bloqueiam escrita", () => {
  assert.equal(isLocked("CLOSED"), true);
  assert.equal(isLocked("ARCHIVED"), true);
  assert.deepEqual(LOCKED_STATUSES, ["CLOSED", "ARCHIVED"]);
});

test("isLocked: turmas abertas e rascunho nao bloqueiam escrita", () => {
  assert.equal(isLocked("OPEN"), false);
  assert.equal(isLocked("DRAFT"), false);
});

test("isLocked: estado desconhecido ou ausente nao bloqueia", () => {
  assert.equal(isLocked(undefined), false);
  assert.equal(isLocked(null), false);
  assert.equal(isLocked(""), false);
  assert.equal(isLocked("CLOSED "), false);
});

test("lockedMessage: menciona que a turma esta fechada ou arquivada", () => {
  assert.equal(lockedMessage("lançar notas"), "Não é possível lançar notas em turma fechada ou arquivada");
  assert.equal(lockedMessage("remover alunos"), "Não é possível remover alunos em turma fechada ou arquivada");
});