import { PrismaClient } from "@prisma/client";
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs/promises";
import { markdownToCvHtml } from "../../../src/lib/cvTemplate";

const prisma = new PrismaClient();

const OUT_DIR = process.env.PDF_DIR || path.resolve(process.cwd(), "generated-pdfs");

export async function generatePdf(data: { evaluationId: string }) {
  const ev = await prisma.evaluation.findUnique({
    where: { id: data.evaluationId },
    include: { job: true },
  });
  if (!ev || !ev.tailoredCv) throw new Error("no tailored CV");

  const profile = await prisma.profile.findFirst();
  const html = markdownToCvHtml(ev.tailoredCv, {
    name: profile?.fullName,
    tagline: profile?.archetype ?? "",
  });

  await fs.mkdir(OUT_DIR, { recursive: true });
  const safeCo = ev.job.company.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const file = path.join(OUT_DIR, `${ev.id}-${safeCo}.pdf`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
      path: file,
      format: "Letter",
      printBackground: true,
      margin: { top: "0.6in", right: "0.6in", bottom: "0.6in", left: "0.6in" },
    });
  } finally {
    await browser.close();
  }

  // For a real deploy you'd upload to S3/R2 and store the public URL.
  // For now we serve the local file path; you can extend with a /api/pdf/[id] route.
  await prisma.evaluation.update({
    where: { id: ev.id },
    data: { pdfPath: `file://${file}` },
  });
}
