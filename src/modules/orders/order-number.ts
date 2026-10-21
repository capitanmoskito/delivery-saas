import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const TIME_ZONE = "America/Mexico_City";

// WEB for online orders, HOM for orders created at the business.
export function generateOrderNumber(source: "online" | "local", date = new Date()) {
  const parts = new Intl.DateTimeFormat("es-MX", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
  const suffix = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${source === "online" ? "WEB" : "HOM"}-${part("day")}${part("month")}${part("year")}-${suffix}`;
}
