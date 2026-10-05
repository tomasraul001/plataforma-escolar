import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_ATTENDANCE_PERCENT,
  attendanceStatus,
  attendancePercentage,
} from "../src/utils/attendance.js";

// Frequência mínima é regra de domínio, não tema de UI. Estes testes existem
// para fixar o limiar: se mudar, muda aqui e em todo o lado que consome o
// status, e não em seis ternarios espalhados por componentes.

test("attendanceStatus: 75% ou mais e ok", () => {
  assert.equal(attendanceStatus(100), "ok");
  assert.equal(attendanceStatus(75), "ok");
  assert.equal(attendanceStatus(80), "ok");
});

test("attendanceStatus: abaixo do minimo mas acima de 50 e warning", () => {
  assert.equal(attendanceStatus(74), "warning");
  assert.equal(attendanceStatus(50), "warning");
});

test("attendanceStatus: abaixo de 50 e critical", () => {
  assert.equal(attendanceStatus(49), "critical");
  assert.equal(attendanceStatus(0), "critical");
});

test("attendanceStatus: valores invalidos nao rebentam", () => {
  assert.equal(attendanceStatus(NaN), "ok");
  assert.equal(attendanceStatus(undefined), "ok");
  assert.equal(attendanceStatus("abc"), "ok");
});

test("attendancePercentage: arredonda o resultado", () => {
  assert.equal(attendancePercentage(2, 2, 3), 67);
  assert.equal(attendancePercentage(1, 1, 3), 33);
  assert.equal(attendancePercentage(1, 1, 2), 50);
});

test("attendancePercentage: denominador zero da 0 e nao Infinity ou NaN", () => {
  assert.equal(attendancePercentage(0, 0, 0), 0);
  assert.equal(attendancePercentage(3, 3, 0), 0);
  assert.equal(attendancePercentage(3, 3, undefined), 100);
});

test("attendancePercentage: expected manda sobre total", () => {
  // Um aluno que entrou a meio: tem 2 registos mas so 1 sessao em que
  // estava inscrito. Usar records.length dava 100%; o correto e 0%.
  assert.equal(attendancePercentage(0, 2, 1), 0);
  assert.equal(attendancePercentage(1, 2, 1), 100);
});

test("MIN_ATTENDANCE_PERCENT e 75", () => {
  assert.equal(MIN_ATTENDANCE_PERCENT, 75);
});