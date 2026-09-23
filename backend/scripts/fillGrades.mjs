import pg from "pg";
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

const MIN_NOTE = 5;
const MAX_NOTE = 20;
const ASSESSMENT_NAMES = ["Teste 1", "Teste 2", "Trabalho Prático", "Exame"];
const WEIGHT = (name) => (name === "Exame" ? 60 : 40 / 3);

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
  console.log(`Conectando via ${host}:${url.port}`);
  url.hostname = host;

  const client = new pg.Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  const q = (text, params) => client.query(text, params);

  const { rows: classes } = await q(
    `SELECT c.id, c.name, c."trainerId" FROM "Class" c WHERE c.status = 'CLOSED' ORDER BY c.name`
  );

  let totalAssessments = 0;
  let totalGrades = 0;
  let totalSkipped = 0;

  for (const cls of classes) {
    let trainerId = cls.trainerId;
    if (!trainerId) {
      const fb = await q(`SELECT id FROM "User" WHERE role = 'formador' LIMIT 1`);
      trainerId = fb.rows[0]?.id ?? null;
    }

    const existingAs = await q(`SELECT id, name FROM "Assessment" WHERE "classId" = $1`, [cls.id]);
    const asMap = new Map(existingAs.rows.map((r) => [r.name, r.id]));
    const assessmentIds = {};
    for (const name of ASSESSMENT_NAMES) {
      if (asMap.has(name)) {
        assessmentIds[name] = asMap.get(name);
      } else {
        const ins = await q(
          `INSERT INTO "Assessment" (id, name, weight, "classId", "createdAt") VALUES ($1,$2,$3,$4,now()) RETURNING id`,
          [randomUUID(), name, WEIGHT(name), cls.id]
        );
        assessmentIds[name] = ins.rows[0].id;
        totalAssessments++;
      }
    }

    const { rows: enrollments } = await q(
      `SELECT id FROM "Enrollment" WHERE "classId" = $1 AND status = 'ACTIVE'`,
      [cls.id]
    );
    if (enrollments.length === 0) {
      console.log(`${cls.name}: sem alunos ativos, ignorada`);
      continue;
    }

    const ids = Object.values(assessmentIds);
    const existingGr = await q(
      `SELECT "assessmentId", "enrollmentId" FROM "Grade" WHERE "assessmentId" = ANY($1) AND "enrollmentId" = ANY($2)`,
      [ids, enrollments.map((e) => e.id)]
    );
    const have = new Set(existingGr.rows.map((r) => `${r.assessmentId}:${r.enrollmentId}`));

    const tuples = [];
    for (const enr of enrollments) {
      for (const name of ASSESSMENT_NAMES) {
        const aid = assessmentIds[name];
        const key = `${aid}:${enr.id}`;
        if (have.has(key)) {
          totalSkipped++;
          continue;
        }
        tuples.push([aid, enr.id]);
      }
    }

    for (let i = 0; i < tuples.length; i += 200) {
      const chunk = tuples.slice(i, i + 200);
      const values = chunk.map((_, idx) => `($${idx * 7 + 1},$${idx * 7 + 2},$${idx * 7 + 3},$${idx * 7 + 4},$${idx * 7 + 5},$${idx * 7 + 6},$${idx * 7 + 7})`).join(",");
      const params = chunk.flatMap(([aid, eid]) => {
        const now = new Date();
        return [randomUUID(), randomInt(MIN_NOTE, MAX_NOTE + 1), aid, eid, trainerId, now, now];
      });
      await q(
        `INSERT INTO "Grade" (id, value, "assessmentId", "enrollmentId", "updatedById", "createdAt", "updatedAt") VALUES ${values}`,
        params
      );
      totalGrades += chunk.length;
    }

    console.log(`${cls.name}: ${enrollments.length} alunos, ${ASSESSMENT_NAMES.length} avaliações, ${tuples.length} notas criadas`);
  }

  console.log(`\n=== RESUMO ===`);
  console.log(`Avaliações criadas: ${totalAssessments}`);
  console.log(`Notas criadas: ${totalGrades}`);
  console.log(`Notas já existentes (puladas): ${totalSkipped}`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});