import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { evaluationQueue } from "@/lib/queue";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: "job not found" }, { status: 404 });
  }

  const evaluation = await prisma.evaluation.create({
    data: {
      jobId: job.id,
      score: 0,
      grade: "F",
      recommendation: "consider",
      status: "pending",
    },
  });

  await evaluationQueue.add(
    "evaluate",
    { evaluationId: evaluation.id },
    { removeOnComplete: 100, removeOnFail: 100 },
  );

  return NextResponse.redirect(new URL(`/evaluations/${evaluation.id}`, req.url));
}
