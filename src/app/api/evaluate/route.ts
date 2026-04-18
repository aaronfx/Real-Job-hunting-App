import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { evaluationQueue } from "@/lib/queue";

const Body = z.object({
  url: z.string().url().nullable().optional(),
  company: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(20),
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { url, company, title, description } = parsed.data;

  const job = await prisma.job.upsert({
    where: { url: url ?? `manual:${company}:${title}:${Date.now()}` },
    create: {
      url: url ?? `manual:${company}:${title}:${Date.now()}`,
      company,
      title,
      description,
      source: "manual",
    },
    update: { description, title, company },
  });

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

  return NextResponse.json({ evaluationId: evaluation.id });
}
