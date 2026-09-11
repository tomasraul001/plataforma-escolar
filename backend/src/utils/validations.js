export function validateEmail(email) {
  if (!email || typeof email !== "string") {
    return "Email é obrigatório";
  }
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.endsWith("@gmail.com")) {
    return "Email deve ser um endereço @gmail.com";
  }
  const local = trimmed.split("@")[0];
  if (local.length < 3) {
    return "Email deve ter pelo menos 3 caracteres antes do @";
  }
  return null;
}

export function validatePassword(password) {
  if (!password || typeof password !== "string") {
    return "Senha é obrigatória";
  }
  if (password.length < 4) {
    return "Senha deve ter pelo menos 4 caracteres";
  }
  if (new Set(password).size === 1) {
    return "Senha não pode ter todos os caracteres iguais";
  }
  const digits = password.split("").map(Number);
  if (digits.every((d) => !isNaN(d))) {
    let ascending = true;
    let descending = true;
    for (let i = 1; i < digits.length; i++) {
      if (digits[i] !== digits[i - 1] + 1) ascending = false;
      if (digits[i] !== digits[i - 1] - 1) descending = false;
    }
    if (ascending || descending) {
      return "Senha não pode conter dígitos sequenciais";
    }
  }
  return null;
}
