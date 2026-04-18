import type { SessionOptions } from "iron-session";
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
