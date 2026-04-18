import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "./session";

export { sessionOptions, type SessionData };

export async function getSession() {
  const store = await cookies();
  return getIronSession<SessionData>(store, sessionOptions());
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.loggedIn) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session;
}
