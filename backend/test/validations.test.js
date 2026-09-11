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

test("validatePassword: rejeita senha com menos de 4 caracteres", () => {
  assert.equal(validatePassword("123"), "Senha deve ter pelo menos 4 caracteres");
  assert.equal(validatePassword("ab"), "Senha deve ter pelo menos 4 caracteres");
});

test("validatePassword: rejeita todos os caracteres iguais", () => {
  assert.equal(validatePassword("1111"), "Senha não pode ter todos os caracteres iguais");
  assert.equal(validatePassword("aaaa"), "Senha não pode ter todos os caracteres iguais");
  assert.equal(validatePassword("9999"), "Senha não pode ter todos os caracteres iguais");
});

test("validatePassword: rejeita sequencia crescente", () => {
  assert.equal(validatePassword("1234"), "Senha não pode conter dígitos sequenciais");
  assert.equal(validatePassword("2345"), "Senha não pode conter dígitos sequenciais");
  assert.equal(validatePassword("5678"), "Senha não pode conter dígitos sequenciais");
  assert.equal(validatePassword("6789"), "Senha não pode conter dígitos sequenciais");
});

test("validatePassword: rejeita sequencia decrescente", () => {
  assert.equal(validatePassword("4321"), "Senha não pode conter dígitos sequenciais");
  assert.equal(validatePassword("5432"), "Senha não pode conter dígitos sequenciais");
  assert.equal(validatePassword("9876"), "Senha não pode conter dígitos sequenciais");
  assert.equal(validatePassword("8765"), "Senha não pode conter dígitos sequenciais");
});

test("validatePassword: aceita senha valida", () => {
  assert.equal(validatePassword("abcd"), null);
  assert.equal(validatePassword("1357"), null);
  assert.equal(validatePassword("2468"), null);
  assert.equal(validatePassword("me9a_senha!"), null);
  assert.equal(validatePassword("a1b2"), null);
  assert.equal(validatePassword("1122"), null);
});
