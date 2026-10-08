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

export function validateEnv(exit = process.exit) {
  const faltamCriticas = ausentes(CRITICAS);
  const faltamChaves = ausentes(CHAVES_ACESSO);

  // Criticas: sem elas o servidor ate arranca, mas cada request autenticado
  // rebenta (jwt malformed) ou o prisma nao liga — falha rapida com mensagem
  // legivel em vez de arrancar partido. `exit` e injetavel para testes.
  if (faltamCriticas.length) {
    console.error("\n[env] Variaveis obrigatorias em falta — o servidor nao arranca:");
    for (const [nome, descricao] of faltamCriticas) {
      console.error(`  - ${nome}: ${descricao}`);
    }
    console.error("  Ver backend/.env.example\n");
    exit(1);
    return {
      criticas: faltamCriticas.map(([nome]) => nome),
      chavesAcesso: faltamChaves.map(([nome]) => nome),
      ok: false,
    };
  }

  if (faltamChaves.length) {
    console.warn("\n[env] Variaveis de ambiente em falta:");
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
    criticas: [],
    chavesAcesso: faltamChaves.map(([nome]) => nome),
    ok: faltamChaves.length === 0,
  };
}

// Interpreta a env TRUST_PROXY.
//   indefinida/vazia -> null (o chamador decide o default)
//   "true" -> 1, "false"/"0" -> false, inteiro positivo -> esse nº de hops
export function parseTrustProxy(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const v = String(value).trim().toLowerCase();
  if (v === "true") return 1;
  if (v === "false" || v === "0") return false;
  const n = Number(v);
  if (Number.isInteger(n) && n > 0) return n;
  return false;
}

// Confianca no X-Forwarded-For. Atras de proxy (Railway) e preciso confiar
// para o rate limit ver o IP real; num deploy DIRETO confiar deixa qualquer
// cliente falsificar o IP e contornar o rate limit, por isso o default e
// nao confiar. Railway e detetado pelos markers RAILWAY_*.
export function trustProxySetting(env = process.env) {
  const explicito = parseTrustProxy(env.TRUST_PROXY);
  if (explicito !== null) return explicito;
  if (env.RAILWAY_PUBLIC_DOMAIN || env.RAILWAY_ENVIRONMENT) return 1;
  return false;
}