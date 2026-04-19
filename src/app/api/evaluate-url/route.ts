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

// Run on Node runtime (not edge) so we can use Puppeteer for JS-rendered pages.
export const runtime = "nodejs";

const SHORT_CONTENT_THRESHOLD = 800;

async function fetchWithPuppeteer(url: string): Promise<string> {
  // Lazy import so cold starts on normal URLs don't pay the Chromium boot cost.
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    );
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45_000 });
    // Give JS frameworks a beat to render job content after the network quiets.
    await new Promise((r) => setTimeout(r, 1500));
    const text = await page.evaluate(() => {
      // Prefer <main>, fallback to body.
      const el = document.querySelector("main") || document.body;
      return (el as HTMLElement).innerText;
    });
    return text;
  } finally {
    await browser.close().catch(() => {});
  }
}

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

  // 1. Fetch the page. Try plain fetch first; fall back to Puppeteer for
  // JS-rendered sites (Workday, many React career pages).
  let pageText = "";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (res.ok) {
      const raw = await res.text();
      pageText = stripHtml(raw).slice(0, 40_000);
    }
  } catch {
    // Ignore; Puppeteer will try next.
  }

  if (pageText.length < SHORT_CONTENT_THRESHOLD) {
    try {
      const rendered = await fetchWithPuppeteer(url);
      pageText = rendered.slice(0, 40_000);
    } catch (err: any) {
      return NextResponse.json(
        {
          error: `Couldn't render the page (${err?.message ?? "unknown error"}). If it requires login, paste the description manually instead.`,
        },
        { status: 400 },
      );
    }
  }

  if (pageText.length < 200) {
    return NextResponse.json(
      {
        error:
          "Page content was too short after rendering. The site may require login or load data from a private API. Paste manually instead.",
      },
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
