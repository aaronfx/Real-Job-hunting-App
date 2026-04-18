import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { env } from "./env";

export type SessionData = {
  loggedIn?: boolean;
};

export function sessionOptions(): SessionOptions {
  return {
    cookieName: "careerops_session",
    password: env.sessionSecret(),
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  };
}

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
