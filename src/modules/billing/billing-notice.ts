export type BillingLevel = "green" | "orange" | "red";

export type BillingNotice = {
  level: BillingLevel;
  // 0-100 fill of the progress line
  progress: number;
  daysLeft: number;
  title: string;
  message: string;
};

const WARNING_DAYS = 10;
const ORANGE_DAYS = 5;
const GRACE_DAYS = 5;
const DUE_DAY_PROGRESS = 60;
const DAY_MS = 86_400_000;

export function daysUntil(dueDate: Date, now = new Date()): number {
  return Math.ceil((dueDate.getTime() - now.getTime()) / DAY_MS);
}

// Returns null while the due date is more than 10 days away.
export function buildBillingNotice(daysLeft: number): BillingNotice | null {
  if (daysLeft > WARNING_DAYS) return null;

  if (daysLeft > ORANGE_DAYS) {
    return {
      level: "green",
      progress: Math.round(((WARNING_DAYS - daysLeft) / WARNING_DAYS) * DUE_DAY_PROGRESS),
      daysLeft,
      title: "Tu mensualidad está por vencer",
      message: `Faltan ${daysLeft} días para el pago de tu servicio.`
    };
  }

  if (daysLeft > 0) {
    return {
      level: "orange",
      progress: Math.round(((WARNING_DAYS - daysLeft) / WARNING_DAYS) * DUE_DAY_PROGRESS),
      daysLeft,
      title: "Tu mensualidad vence pronto",
      message: `Solo ${daysLeft === 1 ? "falta 1 día" : `faltan ${daysLeft} días`} para el pago de tu servicio.`
    };
  }

  const overdueDays = Math.abs(daysLeft);
  const progress = Math.min(100, Math.round(DUE_DAY_PROGRESS + (overdueDays / GRACE_DAYS) * (100 - DUE_DAY_PROGRESS)));

  if (overdueDays >= GRACE_DAYS) {
    return {
      level: "red",
      progress: 100,
      daysLeft,
      title: "Tu servicio llegó a su fin",
      message: "Tu mensualidad no se ha pagado. Si no realizas el pago, el servicio será suspendido."
    };
  }

  return {
    level: "orange",
    progress,
    daysLeft,
    title: overdueDays === 0 ? "Hoy vence tu mensualidad" : "Tu mensualidad está vencida",
    message: overdueDays === 0
      ? "Hoy es el día de pago de tu servicio. Realiza tu pago para evitar interrupciones."
      : `Tu pago lleva ${overdueDays} ${overdueDays === 1 ? "día" : "días"} de retraso. Si no se realiza, el servicio llegará a su fin en ${GRACE_DAYS - overdueDays} ${GRACE_DAYS - overdueDays === 1 ? "día" : "días"}.`
  };
}
