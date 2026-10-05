// Regras de domínio de frequência.
//
// Frequência mínima exigida para não reprovar por falta de presença.
// Vive aqui, e não num ternário dentro de um componente, porque é uma regra do
// negócio: o frontend consome o `status` que o backend devolve em vez de
// repetir o limiar. Se amanhã o valor mudar, muda num sítio só.

const MIN_ATTENDANCE_PERCENT = 75;

// Abaixo do mínimo mas ainda recuperável: o aluno pode repor nas sessões
// seguintes. Muito abaixo disso já é um caso de risco.
const WARNING_PERCENT = 50;

const attendanceStatus = (percentage) => {
  const pct = Number(percentage);
  if (!Number.isFinite(pct)) return "ok";
  if (pct >= MIN_ATTENDANCE_PERCENT) return "ok";
  if (pct >= WARNING_PERCENT) return "warning";
  return "critical";
};

// Percentagem de presença de um aluno.
//
// `total` tem de ser o número de sessões da turma, nunca o número de registos
// do aluno: quem entra a meio do curso só tem registos nas sessões a que
// assistiu, e usar records.length como denominador dava-lhe 100% falso.
// `expected` é o número de sessões que o aluno devia ter tido, o que permite
// distinguir "este aluno faltou a metade" de "ainda não começou".
const attendancePercentage = (present, total, expected) => {
  const denominator = Number(expected ?? total);
  if (!Number.isFinite(denominator) || denominator <= 0) return 0;
  return Math.round((Number(present) / denominator) * 100);
};

export {
  MIN_ATTENDANCE_PERCENT,
  WARNING_PERCENT,
  attendanceStatus,
  attendancePercentage,
};