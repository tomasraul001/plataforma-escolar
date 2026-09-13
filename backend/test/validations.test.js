import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEmail, validatePassword } from "../src/utils/validations.js";

// === validateEmail ===

test("validateEmail: retorna erro para vazio", () => {
  assert.equal(validateEmail(""), "Email é obrigatório");
  assert.equal(validateEmail(null), "Email é obrigatório");
  assert.equal(validateEmail(undefined), "Email é obrigatório");
});

test("validateEmail: rejeita email sem @gmail.com", () => {
  assert.equal(validateEmail("teste@yahoo.com"), "Email deve ser um endereço @gmail.com");
  assert.equal(validateEmail("teste@outlook.com"), "Email deve ser um endereço @gmail.com");
  assert.equal(validateEmail("teste@gmail.com.br"), "Email deve ser um endereço @gmail.com");
});

test("validateEmail: rejeita email com menos de 3 chars antes do @", () => {
  assert.equal(validateEmail("ab@gmail.com"), "Email deve ter pelo menos 3 caracteres antes do @");
  assert.equal(validateEmail("a@gmail.com"), "Email deve ter pelo menos 3 caracteres antes do @");
});

test("validateEmail: aceita email valido", () => {
  assert.equal(validateEmail("abc@gmail.com"), null);
  assert.equal(validateEmail("joao.silva@gmail.com"), null);
  assert.equal(validateEmail("teste123@gmail.com"), null);
  assert.equal(validateEmail("  ABC@Gmail.Com  "), null);
});

// === validatePassword ===

test("validatePassword: retorna erro para vazio", () => {
  assert.equal(validatePassword(""), "Senha é obrigatória");
  assert.equal(validatePassword(null), "Senha é obrigatória");
});

test("validatePassword: rejeita senha com menos de 6 caracteres", () => {
  assert.equal(validatePassword("12345"), "Senha deve ter pelo menos 6 caracteres");
  assert.equal(validatePassword("abc"), "Senha deve ter pelo menos 6 caracteres");
});

test("validatePassword: rejeita todos os caracteres iguais", () => {
  assert.equal(validatePassword("111111"), "Senha não pode ter todos os caracteres iguais");
  assert.equal(validatePassword("aaaaaa"), "Senha não pode ter todos os caracteres iguais");
  assert.equal(validatePassword("999999"), "Senha não pode ter todos os caracteres iguais");
});

test("validatePassword: rejeita sequencia crescente", () => {
  assert.equal(validatePassword("123456"), "Senha não pode conter dígitos sequenciais");
  assert.equal(validatePassword("234567"), "Senha não pode conter dígitos sequenciais");
});

test("validatePassword: rejeita sequencia decrescente", () => {
  assert.equal(validatePassword("654321"), "Senha não pode conter dígitos sequenciais");
  assert.equal(validatePassword("543210"), "Senha não pode conter dígitos sequenciais");
  assert.equal(validatePassword("987654"), "Senha não pode conter dígitos sequenciais");
});

test("validatePassword: aceita senha valida", () => {
  assert.equal(validatePassword("abcdef"), null);
  assert.equal(validatePassword("135792"), null);
  assert.equal(validatePassword("246813"), null);
  assert.equal(validatePassword("me9a_senha!"), null);
  assert.equal(validatePassword("a1b2c3"), null);
  assert.equal(validatePassword("112233"), null);
});
