import { getCurrentUser } from "@/src/lib/current-user";

export async function isSuperAdmin() {
  const user = await getCurrentUser();
  return user?.role === "super_admin";
}
