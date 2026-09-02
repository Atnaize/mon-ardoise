import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export async function currentSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function currentUser() {
  const session = await currentSession();

  return session?.user ?? null;
}
