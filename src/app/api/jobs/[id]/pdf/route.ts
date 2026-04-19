import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pdfQueue } from "@/lib/queue";
import fs from "node:fs/promises";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ev = await prisma.evaluation.findUnique({
    where: { id },
    include: { job: true },
  });
  if (!ev) {
    return new NextResponse("Evaluation not found", { status: 404 });
  }

  if (!ev.tailoredCv) {
    return new NextResponse(
      "Evaluation didn't generate a tailored CV. Re-run the evaluation and try again.",
      { status: 409 },
    );
  }

  // If we have a filesystem path, try to stream the bytes directly.
  if (ev.pdfPath) {
    const file = ev.pdfPath.replace(/^file:\/\//, "");
    try {
      const bytes = await fs.readFile(file);
      const safeCo = ev.job.company.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const filename = `cv-${safeCo}-${ev.id.slice(0, 8)}.pdf`;
      return new NextResponse(new Uint8Array(bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch {
      // Path was stored but the file isn't there. Fall through to regenerate.
    }
  }

  // No PDF yet — queue one and return a tiny HTML page that auto-refreshes.
  await pdfQueue.add("pdf", { evaluationId: ev.id });
  const html = `<!doctype html>
<meta charset="utf-8">
<title>Generating PDF…</title>
<meta http-equiv="refresh" content="3">
<style>
  body { font-family: system-ui, sans-serif; margin: 80px auto; max-width: 480px; color: #333; }
  h1 { font-size: 20px; }
  p { color: #666; }
  code { background: #f4f4f4; padding: 1px 5px; border-radius: 3px; }
</style>
<h1>Generating your tailored CV…</h1>
<p>This usually takes 5–15 seconds. The page will reload automatically.</p>
<p><small>If nothing happens after a minute, check that your <code>npm run worker</code> terminal is still running.</small></p>`;
  return new NextResponse(html, {
    status: 202,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
