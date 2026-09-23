import pg from "pg";
import bcrypt from "bcryptjs";
import dns from "dns/promises";
import net from "net";
import { randomInt, randomUUID } from "crypto";
import { config as loadEnv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

loadEnv({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env") });

const DSN = process.env.DATABASE_URL;
if (!DSN) {
  console.error("DATABASE_URL não definida em backend/.env");
  process.exit(1);
}

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || "Mudar@123";
const STUDENTS_PER_CLASS = parseInt(process.env.SEED_STUDENTS_PER_CLASS || "12", 10);

const REGIONS = ["Massinga", "Homoíne", "Inhambane"];
const AREAS = ["Informática", "Eletricidade", "Culinária", "Corte e Costura", "Serralharia"];
const ASSIGN = {
  Massinga: ["Informática", "Eletricidade", "Culinária"],
  "Homoíne": ["Corte e Costura", "Serralharia", "Informática"],
  Inhambane: ["Eletricidade", "Culinária", "Corte e Costura"],
};
const SLUG = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const SECRET_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateSecretKey() {
  let key = "";
  for (let i = 0; i < 8; i++) {
    key += SECRET_CHARS.charAt(randomInt(SECRET_CHARS.length));
    if (i === 3) key += "-";
  }
  return key;
}

function generateClassCode(areaName) {
  const prefix = areaName.substring(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(randomInt(1000)).padStart(3, "0")}`;
}

function probe(host, port, timeout = 2500) {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port });
    const done = (ok) => { sock.destroy(); resolve(ok); };
    sock.setTimeout(timeout);
    sock.once("connect", () => done(true));
    sock.once("timeout", () => done(false));
    sock.once("error", () => done(false));
  });
}

async function resolveAliveHost(url) {
  const intended = url.hostname;
  const port = parseInt(url.port || "5432", 10);
  let addrs = [];
  try {
    addrs = (await dns.resolve4(intended)).filter(Boolean);
  } catch {
    addrs = [];
  }
  if (!addrs.includes(intended)) addrs.unshift(intended);
  for (const a of addrs) {
    if (await probe(a, port)) return a;
  }
  throw new Error(`Nenhum endereço de ${intended} respondeu na porta ${port}`);
}

async function main() {
  const url = new URL(DSN);
  const host = await resolveAliveHost(url);
  console.log(`Conectando via ${host}:${url.port} (hostname original: ${url.hostname})`);
  url.hostname = host;

  const client = new pg.Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  const q = (text, params, opts) => client.query(text, params, opts);

  const created = { region: 0, area: 0, trainer: 0, class: 0, student: 0, enrollment: 0 };
  const skipped = { region: 0, area: 0, trainer: 0, class: 0, student: 0, enrollment: 0 };

  console.log(`Hash de ${DEFAULT_PASSWORD} (bcrypt, cost 10)...`);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  try {
    await q("BEGIN");

    // ---- Regiões ----
    const regionIds = new Map();
    for (const name of REGIONS) {
      const code = name.substring(0, 3).toUpperCase();
      const existing = await q('SELECT id FROM "Region" WHERE name = $1 OR code = $2', [name, code]);
      if (existing.rowCount) {
        regionIds.set(name, existing.rows[0].id);
        skipped.region++;
      } else {
        const ins = await q(
          'INSERT INTO "Region" (id, name, code, active, "createdAt", "updatedAt") VALUES ($1,$2,$3,true,now(),now()) RETURNING id',
          [randomUUID(), name, code]
        );
        regionIds.set(name, ins.rows[0].id);
        created.region++;
      }
    }

    // ---- Áreas de formação ----
    const areaIds = new Map();
    for (const name of AREAS) {
      const code = name.substring(0, 3).toUpperCase();
      const existing = await q('SELECT id FROM "TrainingArea" WHERE name = $1 OR code = $2', [name, code]);
      if (existing.rowCount) {
        areaIds.set(name, existing.rows[0].id);
        skipped.area++;
      } else {
        const ins = await q(
          'INSERT INTO "TrainingArea" (id, name, code, active, "createdAt", "updatedAt") VALUES ($1,$2,$3,true,now(),now()) RETURNING id',
          [randomUUID(), name, code]
        );
        areaIds.set(name, ins.rows[0].id);
        created.area++;
      }
    }

    const ensureUser = async ({ email, name, role, sexo }) => {
      const existing = await q('SELECT id FROM "User" WHERE email = $1', [email]);
      if (existing.rowCount) return { id: existing.rows[0].id, existed: true };
      const ins = await q(
        'INSERT INTO "User" (id, email, name, password, role, sexo, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,now(),now()) RETURNING id',
        [randomUUID(), email, name, passwordHash, role, sexo]
      );
      return { id: ins.rows[0].id, existed: false };
    };

    const NOW = new Date();
    const past = new Date(NOW);
    past.setDate(past.getDate() - 120);
    const usedCodes = new Set();
    const usedKeys = new Set();

    // ---- Formadores → turmas → formandos → matrículas ----
    for (const region of REGIONS) {
      for (let ti = 0; ti < 3; ti++) {
        const area = ASSIGN[region][ti];
        console.log(`→ formador ${ti + 1}/3 de ${region} (${area})`);
        const trainer = await ensureUser({
          email: `formador.${SLUG(region)}.${ti + 1}@teste.com`,
          name: `Formador ${region} ${ti + 1}`,
          role: "formador",
          sexo: ["M", "F", "M"][ti],
        });
        if (trainer.existed) skipped.trainer++; else created.trainer++;

        for (const [suffix, status] of [["A", "OPEN"], ["B", "CLOSED"]]) {
          const className = `Turma ${area} ${region} ${ti + 1}${suffix}`;
          const existingClass = await q('SELECT id FROM "Class" WHERE name = $1', [className]);
          let classId;
          if (existingClass.rowCount) {
            classId = existingClass.rows[0].id;
            skipped.class++;
          } else {
            let code;
            let secretKey;
            do {
              code = generateClassCode(area);
            } while (usedCodes.has(code) || (await q('SELECT 1 FROM "Class" WHERE code = $1', [code])).rowCount);
            do {
              secretKey = generateSecretKey();
            } while (usedKeys.has(secretKey) || (await q('SELECT 1 FROM "Class" WHERE "secretKey" = $1', [secretKey])).rowCount);
            usedCodes.add(code);
            usedKeys.add(secretKey);
            const clos = status === "CLOSED";
            const ins = await q(
              'INSERT INTO "Class" (id, name, code, "secretKey", status, "startDate", "endDate", "closedAt", "trainerId", "trainingAreaId", "locationId", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),now()) RETURNING id',
              [randomUUID(), className, code, secretKey, status, status === "OPEN" ? NOW : past, clos ? NOW : null, clos ? NOW : null, trainer.id, areaIds.get(area), regionIds.get(region)]
            );
            classId = ins.rows[0].id;
            created.class++;
          }

          // ---- Formandos (batch por turma) ----
          const slots = Array.from({ length: STUDENTS_PER_CLASS }, (_, i) => i + 1);
          const slotEmails = slots.map((s) => `formando.${SLUG(region)}.${ti + 1}${suffix.toLowerCase()}.${String(s).padStart(2, "0")}@teste.com`);
          const found = await q('SELECT id, email FROM "User" WHERE email = ANY($1)', [slotEmails]);
          const foundIds = new Map(found.rows.map((r) => [r.email, r.id]));

          const studentIds = [];
          for (const s of slots) {
            const email = slotEmails[s - 1];
            let studentId = foundIds.get(email);
            if (studentId) {
              skipped.student++;
            } else {
              const ins = await q(
                'INSERT INTO "User" (id, email, name, password, role, sexo, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,now(),now()) RETURNING id',
                [randomUUID(), email, `Formando ${region} ${ti + 1}${suffix} ${String(s).padStart(2, "0")}`, passwordHash, "formando", s % 2 ? "M" : "F"]
              );
              studentId = ins.rows[0].id;
              created.student++;
            }
            studentIds.push(studentId);
          }

          // ---- Matrículas (batch por turma) ----
          const existingEnr = await q('SELECT "studentId" FROM "Enrollment" WHERE "classId" = $1 AND "studentId" = ANY($2)', [classId, studentIds]);
          const existingEnrSet = new Set(existingEnr.rows.map((r) => r.studentId));
          for (const s of slots) {
            const studentId = studentIds[s - 1];
            if (existingEnrSet.has(studentId)) {
              skipped.enrollment++;
            } else {
              await q(
                'INSERT INTO "Enrollment" (id, "classId", "studentId", status, sexo, "joinedAt") VALUES ($1,$2,$3,$4,$5,now()) RETURNING id',
                [randomUUID(), classId, studentId, "ACTIVE", s % 2 ? "M" : "F"]
              );
              created.enrollment++;
            }
          }
        }
      }
    }

    await q("COMMIT");
  } catch (err) {
    await q("ROLLBACK");
    console.error("ERRO no seed (rollback aplicado):", err);
    await client.end();
    process.exit(1);
  }

  // ---- Verificação ----
  const ver = await q(
    `SELECT c.name, c.code, c."secretKey", c.status, r.name AS region, ta.name AS area,
            (SELECT count(*) FROM "Enrollment" e WHERE e."classId" = c.id) AS alunos
     FROM "Class" c
     LEFT JOIN "Region" r ON r.id = c."locationId"
     LEFT JOIN "TrainingArea" ta ON ta.id = c."trainingAreaId"
     WHERE c.name LIKE 'Turma %'
     ORDER BY c.name`
  );
  await client.end();

  const alunosMin = Math.min(...ver.rows.map((r) => r.alunos));
  const alunosMax = Math.max(...ver.rows.map((r) => r.alunos));

  console.log("\n=== RESUMO ===");
  console.log(`Senha padrão: ${DEFAULT_PASSWORD}`);
  for (const k of Object.keys(created)) {
    console.log(`- ${k}: ${created[k]} criados, ${skipped[k]} já existiam`);
  }
  console.log(`\nFormandos por turma: mínimo ${alunosMin}, máximo ${alunosMax}`);
  console.log("\n=== TURMAS (code | secretKey | status | região | área | alunos) ===");
  for (const r of ver.rows) {
    console.log(`${r.code} | ${r.secretKey} | ${r.status} | ${r.region} | ${r.area} | ${r.alunos}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});