import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { evaluationQueue } from "@/lib/queue";
import {
  JOB_EXTRACTION_SYSTEM,
  buildExtractionUserMessage,
  parseJsonish,
} from "@/lib/claude";
import { stripHtml } from "@/lib/portals";

const Body = z.object({
  url: z.string().url(),
});

type Extracted = {
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  description: string;
  isJobPosting: boolean;
};

function isSafeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return false;
    const host = u.hostname;
    if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(host)) return false;
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host))
      return false;
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { url } = parsed.data;

  if (!isSafeUrl(url)) {
    return NextResponse.json({ error: "URL must be a public http(s) address" }, { status: 400 });
  }

  // 1. Fetch the page. Use a realistic user agent; some sites reject defaults.
  let pageText: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Could not fetch the page (HTTP ${res.status}). If it requires JS or login, paste the description manually instead.` },
        { status: 400 },
      );
    }
    const raw = await res.text();
    pageText = stripHtml(raw).slice(0, 40_000);
    if (pageText.length < 200) {
      return NextResponse.json(
        { error: "Page content was too short to extract. Paste manually instead." },
        { status: 400 },
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: `Fetch failed: ${err?.message ?? String(err)}` },
      { status: 400 },
    );
  }

  // 2. Ask Claude to extract structured job data.
  const anthropic = new Anthropic({ apiKey: env.anthropicApiKey() });
  const msg = await anthropic.messages.create({
    model: env.claudeModel(),
    max_tokens: 2048,
    system: JOB_EXTRACTION_SYSTEM,
    messages: [
      {
        role: "user",
        content: buildExtractionUserMessage({ url, text: pageText }),
      },
    ],
  });
  const text = msg.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("");

  let extracted: Extracted;
  try {
    extracted = parseJsonish<Extracted>(text);
  } catch {
    return NextResponse.json(
      { error: "Claude couldn't parse a job posting from that page. Paste manually instead." },
      { status: 422 },
    );
  }

  if (!extracted.isJobPosting) {
    return NextResponse.json(
      {
        error:
          "That URL doesn't look like a specific job posting. Open the exact job's page in your browser and paste that URL.",
      },
      { status: 422 },
    );
  }

  // 3. Persist the Job and queue an evaluation.
  const job = await prisma.job.upsert({
    where: { url },
    create: {
      url,
      company: extracted.company || "Unknown",
      title: extracted.title || "Unknown role",
      location: extracted.location ?? undefined,
      remote: !!extracted.remote,
      description: extracted.description || "",
      source: "url-paste",
    },
    update: {
      company: extracted.company || "Unknown",
      title: extracted.title || "Unknown role",
      location: extracted.location ?? undefined,
      remote: !!extracted.remote,
      description: extracted.description || "",
    },
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
