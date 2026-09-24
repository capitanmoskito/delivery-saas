type ScheduleEntry = {
  dayOfWeek: number;
  enabled: boolean;
  openTime: string | null;
  closeTime: string | null;
};

function parseTimeToMinutes(time: string): number | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = Number(match[1]) % 12;
  const minutes = Number(match[2]);
  if (match[3].toUpperCase() === "PM") hours += 12;

  return hours * 60 + minutes;
}

export function isBusinessOpenNow(schedules: ScheduleEntry[], now = new Date()): boolean {
  // dayOfWeek: 1 = Lunes ... 7 = Domingo, matching JS getDay() where 0 = Sunday
  const jsDay = now.getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;

  const today = schedules.find((schedule) => schedule.dayOfWeek === dayOfWeek);
  if (!today || !today.enabled || !today.openTime || !today.closeTime) return false;

  const openMinutes = parseTimeToMinutes(today.openTime);
  const closeMinutes = parseTimeToMinutes(today.closeTime);
  if (openMinutes === null || closeMinutes === null) return false;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (closeMinutes > openMinutes) {
    return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
  }

  // handles schedules that cross midnight (e.g. 03:00 PM - 01:00 AM)
  return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
}
