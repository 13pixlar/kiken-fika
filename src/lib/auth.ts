import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

type SessionData = {
  isAdmin?: boolean;
  username?: string;
};

const sessionPassword =
  process.env.SESSION_PASSWORD ??
  "please-change-this-super-long-session-password-1234";

export const sessionOptions: SessionOptions = {
  password: sessionPassword,
  cookieName: "kiken-admin-session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireAdmin() {
  const session = await getSession();
  return Boolean(session.isAdmin);
}
