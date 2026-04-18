import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scanQueue } from "@/lib/queue";
import { env } from "@/lib/env";

// Hit by GitHub Actions once a day. Protected by CRON_SECRET.
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.cronSecret()}`;
  if (!env.cronSecret() || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const portals = await prisma.portal.findMany({ where: { enabled: true } });
  for (const p of portals) await scanQueue.add("scan", { portalId: p.id });
  return NextResponse.json({ queued: portals.length });
}
