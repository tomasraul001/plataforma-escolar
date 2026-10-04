// Relatorio das variaveis de ambiente em falta.
// Usado no arranque (src/app.js) para falhar de forma legivel em vez de
// deixar o primeiro request autenticado rebentar com um jwt malformed.

const CRITICAS = [
  ["DATABASE_URL", "DSN do PostgreSQL. Sem ela o prisma generate falha em build."],
  ["SECRET_KEY", "chave de assinatura do JWT. Sem ela nenhum request autenticado passa."],
];

const CHAVES_ACESSO = [
  ["COORDENADOR_KEY", "coordenador"],
  ["FORMADOR_KEY", "formador"],
  ["FORMANDO_KEY", "formando"],
  ["SECRETARIA_KEY", "secretaria"],
];

const OPCIONAIS = [
  ["PORT", "porta do servidor (default 3000)"],
  ["FRONTEND_URL", "allowlist de CORS"],
  ["RAILWAY_PUBLIC_DOMAIN", "allowlist de CORS (injetada pelo Railway)"],
];

function ausentes(definicoes) {
  return definicoes.filter(([nome]) => !process.env[nome]);
}

export function validateEnv() {
  const faltamCriticas = ausentes(CRITICAS);
  const faltamChaves = ausentes(CHAVES_ACESSO);

  if (faltamCriticas.length || faltamChaves.length) {
    console.warn("\n[env] Variaveis de ambiente em falta:");
    for (const [nome, descricao] of faltamCriticas) {
      console.warn(`  - ${nome}: ${descricao}`);
    }
    for (const [nome] of faltamChaves) {
      console.warn(`  - ${nome}: chave de acesso em falta, POST /register devolve 500`);
    }
    console.warn("  Ver backend/.env.example\n");
  }

  // As chaves de acesso sao comparadas como valores de objeto em
  // auth.controller.js, logo duas iguais fazem uma role sobrescrever a outra:
  // quem se registar com essa chave fica com a role errada, em silencio.
  const repetidas = CHAVES_ACESSO.filter(
    ([nome], i) =>
      Boolean(process.env[nome]) &&
      CHAVES_ACESSO.slice(0, i).some(([outro]) => process.env[outro] === process.env[nome]),
  );
  if (repetidas.length) {
    console.warn(
      `[env] accessKey repetida(s): ${repetidas.map(([n]) => n).join(", ")}. ` +
        "O registo vai atribuir a role errada — cada role precisa da sua chave.",
    );
  }

  const defined = OPCIONAIS.filter(([nome]) => process.env[nome]);
  if (defined.length === OPCIONAIS.length) {
    console.warn("[env] todas as variaveis opcionais definidas");
  }

  return {
    criticas: faltamCriticas.map(([nome]) => nome),
    chavesAcesso: faltamChaves.map(([nome]) => nome),
    ok: faltamCriticas.length === 0 && faltamChaves.length === 0,
  };
}