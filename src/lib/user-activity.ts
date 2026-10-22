import { prisma } from "@/src/lib/prisma";

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

// One row per user per day; failures must never break the request that triggered them.
export async function recordUserActivity(userId: string) {
  try {
    const day = todayUtc();
    await prisma.userActivityDay.upsert({
      where: { userId_day: { userId, day } },
      create: { userId, day },
      update: {}
    });
  } catch (error) {
    console.error("User activity error:", error);
  }
}

export { todayUtc };
