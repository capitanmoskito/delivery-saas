import { prisma } from "@/src/lib/prisma";
import { todayUtc } from "@/src/lib/user-activity";

const CHART_DAYS = 30;
const TOP_LIMIT = 20;

export type RankedItem = { name: string; count: number };

export type Audience = "users" | "businesses";

export type UsageStats = {
  audience: Audience;
  dailyActive: Array<{ date: string; count: number }>;
  registeredUsers: number;
  activeUsers: number;
  activeTrials: number;
  countries: RankedItem[];
  cities: RankedItem[];
  municipalities: RankedItem[];
  gender: { male: number; female: number; unspecified: number; malePercent: number; femalePercent: number };
};

function topRanking(values: Array<string | null | undefined>): RankedItem[] {
  const counts = new Map<string, number>();
  const labels = new Map<string, string>();
  for (const value of values) {
    const label = value?.trim();
    if (!label) continue;
    const key = label.toLocaleLowerCase("es-MX");
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!labels.has(key)) labels.set(key, label);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ name: labels.get(key) ?? key, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es-MX"))
    .slice(0, TOP_LIMIT);
}

export async function getUsageStats(audience: Audience): Promise<UsageStats> {
  const today = todayUtc();
  const since = new Date(today);
  since.setUTCDate(since.getUTCDate() - (CHART_DAYS - 1));
  const notAdmin = { role: audience === "users" ? ("customer" as const) : ("restaurant_admin" as const) };

  const [activity, registeredUsers, activeUsers, activeTrials, addresses, profiles, genderGroups] = await Promise.all([
    prisma.userActivityDay.groupBy({ by: ["day"], where: { day: { gte: since }, user: notAdmin }, _count: { _all: true } }),
    prisma.user.count({ where: notAdmin }),
    prisma.userActivityDay.findMany({ where: { day: { gte: since }, user: notAdmin }, distinct: ["userId"], select: { userId: true } }),
    audience === "businesses"
      ? prisma.tenant.count({ where: { status: "trial", OR: [{ trialEndsAt: null }, { trialEndsAt: { gt: new Date() } }] } })
      : Promise.resolve(0),
    audience === "users"
      ? prisma.customerAddress.findMany({ orderBy: { updatedAt: "desc" }, distinct: ["userId"], select: { country: true, city: true, municipality: true } })
      : Promise.resolve([]),
    audience === "businesses"
      ? prisma.businessProfile.findMany({ select: { country: true, city: true, municipality: true } })
      : Promise.resolve([]),
    prisma.user.groupBy({ by: ["gender"], where: notAdmin, _count: { _all: true } })
  ]);

  const perDay = new Map(activity.map((row) => [row.day.toISOString().slice(0, 10), row._count._all]));
  const dailyActive = Array.from({ length: CHART_DAYS }, (_, index) => {
    const date = new Date(since);
    date.setUTCDate(since.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { date: key, count: perDay.get(key) ?? 0 };
  });

  const locations = [...addresses, ...profiles];
  const genderCount = (value: string) => genderGroups.find((row) => row.gender === value)?._count._all ?? 0;
  const male = genderCount("male");
  const female = genderCount("female");
  const known = male + female;

  return {
    audience,
    dailyActive,
    registeredUsers,
    activeUsers: activeUsers.length,
    activeTrials,
    countries: topRanking(locations.map((item) => item.country)),
    cities: topRanking(locations.map((item) => item.city)),
    municipalities: topRanking(locations.map((item) => item.municipality)),
    gender: {
      male,
      female,
      unspecified: genderGroups.reduce((total, row) => total + row._count._all, 0) - known,
      malePercent: known ? Math.round((male / known) * 1000) / 10 : 0,
      femalePercent: known ? Math.round((female / known) * 1000) / 10 : 0
    }
  };
}
