import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "./env";

let connection: IORedis | null = null;
function conn() {
  if (!connection) {
    connection = new IORedis(env.redisUrl(), { maxRetriesPerRequest: null });
  }
  return connection;
}

export const evaluationQueue = new Queue("evaluation", { connection: conn() });
export const scanQueue = new Queue("scan", { connection: conn() });
export const pdfQueue = new Queue("pdf", { connection: conn() });

export type EvaluateJobData = { evaluationId: string };
export type ScanJobData = { portalId?: string };
export type PdfJobData = { evaluationId: string };
