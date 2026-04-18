import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pdfQueue } from "@/lib/queue";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ev = await prisma.evaluation.findUnique({ where: { id } });
  if (!ev) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (!ev.tailoredCv) {
    return NextResponse.json(
      { error: "Tailored CV not ready yet. Wait a moment and retry." },
      { status: 409 },
    );
  }

  // If we already generated a PDF, serve it
  if (ev.pdfPath) {
    return NextResponse.redirect(ev.pdfPath, 302);
  }

  // Otherwise, queue generation and tell the client to try again shortly.
  await pdfQueue.add("pdf", { evaluationId: ev.id });
  return NextResponse.json(
    { queued: true, message: "PDF being generated. Refresh in a few seconds." },
    { status: 202 },
  );
}
