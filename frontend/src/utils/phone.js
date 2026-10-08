// Numeros de Mocambique: 9 digitos, com ou sem +258 no inicio.
export function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("258") && digits.length === 12) return digits;
  if (digits.length === 9) return `258${digits}`;
  return null;
}

export function buildWhatsAppLink(number, text) {
  const digits = normalizePhone(number);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function buildSmsGroupLink(numbers, text) {
  const digits = numbers.map(normalizePhone).filter(Boolean);
  if (digits.length === 0) return null;
  const body = text ? `?&body=${encodeURIComponent(text)}` : "";
  return `sms:${digits.join(",")}${body}`;
}