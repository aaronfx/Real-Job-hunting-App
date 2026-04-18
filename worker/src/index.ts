import { Worker } from "bullmq";
import IORedis from "ioredis";
import { evaluateJob } from "./jobs/evaluate";
import { scanPortal } from "./jobs/scan";
import { generatePdf } from "./jobs/pdf";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.error("REDIS_URL is not set.");
  process.exit(1);
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const evaluationWorker = new Worker(
  "evaluation",
  async (job) => evaluateJob(job.data),
  { connection, concurrency: 2 },
);

const scanWorker = new Worker(
  "scan",
  async (job) => scanPortal(job.data),
  { connection, concurrency: 3 },
);

const pdfWorker = new Worker(
  "pdf",
  async (job) => generatePdf(job.data),
  { connection, concurrency: 1 },
);

for (const [name, w] of [
  ["evaluation", evaluationWorker],
  ["scan", scanWorker],
  ["pdf", pdfWorker],
] as const) {
  w.on("completed", (j) => console.log(`[${name}] completed ${j.id}`));
  w.on("failed", (j, err) => console.error(`[${name}] failed ${j?.id}:`, err));
}

console.log("CareerOps worker online.");
