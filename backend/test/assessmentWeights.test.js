import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getAssessmentPercent,
  calculateMediaByAssessments,
  calculateMediaByGradeEntries,
} from "../src/modules/grades/assessmentWeights.js";

const EXAME_PESO = 60;
const OUTROS_PESO = 40 / 3;

test("getAssessmentPercent: Exame vale 60% e demais avaliam 40/3% cada", () => {
  assert.equal(getAssessmentPercent("Exame"), EXAME_PESO);
  assert.equal(getAssessmentPercent("Teste 1"), OUTROS_PESO);
  assert.equal(getAssessmentPercent("Teste 2"), OUTROS_PESO);
  assert.equal(getAssessmentPercent("Trabalho"), OUTROS_PESO);
});

test("calculateMediaByAssessments: 3 testes + trabalho + exame todos preenchidos", () => {
  const aval = [
    { id: "a1", name: "Teste 1" },
    { id: "a2", name: "Teste 2" },
    { id: "a3", name: "Teste 3" },
    { id: "a4", name: "Trabalho" },
    { id: "a5", name: "Exame" },
  ];
  const notas = { a1: 10, a2: 10, a3: 10, a4: 10, a5: 10 };
  assert.equal(calculateMediaByAssessments(notas, aval), 10);
});

test("calculateMediaByAssessments: respeita a ponderação 40%/60%", () => {
  const aval = [
    { id: "a1", name: "Teste 1" },
    { id: "a5", name: "Exame" },
  ];
  const notas = { a1: 0, a5: 10 };
  const media = calculateMediaByAssessments(notas, aval);
  assert.equal(media, 8);
});

test("calculateMediaByAssessments: exame sozinho retorna 10", () => {
  const aval = [{ id: "a5", name: "Exame" }];
  assert.equal(calculateMediaByAssessments({ a5: 10 }, aval), 10);
});

test("calculateMediaByAssessments: sem nenhuma nota retorna null", () => {
  const aval = [{ id: "a1", name: "Teste 1" }];
  assert.equal(calculateMediaByAssessments({}, aval), null);
});

test("calculateMediaByAssessments: ignora notas nulas/undefined", () => {
  const aval = [
    { id: "a1", name: "Teste 1" },
    { id: "a5", name: "Exame" },
  ];
  const media = calculateMediaByAssessments({ a1: null, a2: undefined, a5: 10 }, aval);
  assert.equal(media, 10);
});

test("calculateMediaByGradeEntries: pondera pela assessment name", () => {
  const notas = [
    { assessment: { name: "Teste 1" }, value: 0 },
    { assessment: { name: "Exame" }, value: 10 },
  ];
  assert.equal(calculateMediaByGradeEntries(notas), 8);
});

test("calculateMediaByGradeEntries: vazio retorna null", () => {
  assert.equal(calculateMediaByGradeEntries([]), null);
});
