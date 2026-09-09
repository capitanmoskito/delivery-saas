import { cookies } from "next/headers";

export async function getCurrentUser() {

  const cookieStore =
    await cookies();

  const userCookie =
    cookieStore.get(
      "saas_user"
    );

  if (!userCookie) {
    return null;
  }

  return JSON.parse(
    userCookie.value
  );
}