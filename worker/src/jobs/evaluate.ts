import { PrismaClient } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";
import {
  EVALUATION_SYSTEM,
  TAILOR_CV_SYSTEM,
  buildEvaluationUserMessage,
  buildTailorUserMessage,
  parseJsonish,
} from "../../../src/lib/claude";

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
const MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || "4096", 10);

type EvalPayload = {
  score: number;
  grade: string;
  recommendation: string;
  dimensions?: Record<string, { score: number; note: string }>;
  roleSummary?: unknown;
  cvMatch?: unknown;
  levelStrategy?: unknown;
  compensation?: unknown;
  personalization?: unknown;
  interviewPrep?: unknown;
  keywords?: string[];
};

export async function evaluateJob(data: { evaluationId: string }) {
  const ev = await prisma.evaluation.findUnique({
    where: { id: data.evaluationId },
    include: { job: true },
  });
  if (!ev) throw new Error(`No evaluation ${data.evaluationId}`);

  await prisma.evaluation.update({
    where: { id: ev.id },
    data: { status: "running" },
  });

  try {
    const profile = (await prisma.profile.findFirst()) ?? {};
    const cv = await prisma.cV.findUnique({ where: { label: "default" } });
    if (!cv?.markdown) {
      throw new Error("No base CV found. Set one at /cv first.");
    }

    // --- 1. Evaluation
    const evalMsg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: EVALUATION_SYSTEM,
      messages: [
        {
          role: "user",
          content: buildEvaluationUserMessage({
            profile: profile as unknown as Record<string, unknown>,
            cv: cv.markdown,
            jobTitle: ev.job.title,
            jobCompany: ev.job.company,
            jobDescription: ev.job.description,
            jobUrl: ev.job.url,
          }),
        },
      ],
    });
    const evalText = evalMsg.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("");
    const parsed = parseJsonish<EvalPayload>(evalText);

    // --- 2. Tailor CV
    const tailorMsg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: TAILOR_CV_SYSTEM,
      messages: [
        {
          role: "user",
          content: buildTailorUserMessage({
            baseCv: cv.markdown,
            jobTitle: ev.job.title,
            jobCompany: ev.job.company,
            jobDescription: ev.job.description,
            keywords: parsed.keywords ?? [],
          }),
        },
      ],
    });
    const tailoredCv = tailorMsg.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("")
      .trim();

    await prisma.evaluation.update({
      where: { id: ev.id },
      data: {
        status: "done",
        score: clamp(parsed.score, 0, 5),
        grade: parsed.grade ?? "C",
        recommendation: parsed.recommendation ?? "consider",
        dimensions: (parsed.dimensions ?? {}) as any,
        roleSummary: (parsed.roleSummary ?? null) as any,
        cvMatch: (parsed.cvMatch ?? null) as any,
        levelStrategy: (parsed.levelStrategy ?? null) as any,
        compensation: (parsed.compensation ?? null) as any,
        personalization: (parsed.personalization ?? null) as any,
        interviewPrep: (parsed.interviewPrep ?? null) as any,
        keywords: parsed.keywords ?? [],
        tailoredCv,
      },
    });

    // Ensure an Application row exists so it shows up in the pipeline
    await prisma.application.upsert({
      where: { evaluationId: ev.id },
      create: { evaluationId: ev.id, status: "not-applied" },
      update: {},
    });
  } catch (err: any) {
    await prisma.evaluation.update({
      where: { id: ev.id },
      data: { status: "error", errorMessage: err?.message ?? String(err) },
    });
    throw err;
  }
}

function clamp(n: number, lo: number, hi: number) {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}
