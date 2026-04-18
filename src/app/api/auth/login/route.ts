import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/dashboard");

  if (password !== env.appPassword()) {
    return NextResponse.redirect(new URL(`/login?error=1&next=${encodeURIComponent(next)}`, req.url));
  }

  const session = await getSession();
  session.loggedIn = true;
  await session.save();
  return NextResponse.redirect(new URL(next, req.url));
}
