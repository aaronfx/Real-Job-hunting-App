import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";

let client: Anthropic | null = null;

export function claude(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: env.anthropicApiKey() });
  }
  return client;
}

// Strict JSON extractor that tolerates code fences.
export function parseJsonish<T = unknown>(text: string): T {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const body = fenced ? fenced[1] : trimmed;
  return JSON.parse(body) as T;
}

/**
 * Ten-dimension scoring rubric. Tweak weights to taste.
 */
export const RUBRIC = {
  dimensions: [
    { key: "roleFit", label: "Role fit vs my archetype", weight: 0.18 },
    { key: "skillMatch", label: "Skill match to my CV", weight: 0.15 },
    { key: "seniority", label: "Level / seniority alignment", weight: 0.1 },
    { key: "compensation", label: "Compensation signal", weight: 0.12 },
    { key: "growth", label: "Growth / learning potential", weight: 0.08 },
    { key: "company", label: "Company quality & stage", weight: 0.1 },
    { key: "workStyle", label: "Remote / location / hours fit", weight: 0.1 },
    { key: "mission", label: "Mission / values resonance", weight: 0.05 },
    { key: "risk", label: "Risk flags (layoffs, churn, scam)", weight: 0.07 },
    { key: "uniqueness", label: "How rare / special this role is", weight: 0.05 },
  ],
};

export const EVALUATION_SYSTEM = `
You are CareerOps, a rigorous hiring-market analyst helping a single user decide whether to apply to a job.

You always respond with a SINGLE valid JSON object. No prose outside JSON. No markdown fences.

Output schema:
{
  "score": number,           // 0.0 - 5.0, overall
  "grade": "A"|"B"|"C"|"D"|"F",
  "recommendation": "apply-now"|"strong"|"consider"|"skip",
  "dimensions": { [key: string]: { score: number, note: string } },
  "roleSummary": { "oneLiner": string, "level": string, "scope": string, "team": string },
  "cvMatch": { "strengths": string[], "gaps": string[], "risks": string[] },
  "levelStrategy": { "recommendedLevel": string, "howToPitch": string },
  "compensation": { "estRangeUsd": string, "confidence": string, "notes": string },
  "personalization": { "whyThisUser": string, "anglesToEmphasize": string[] },
  "interviewPrep": { "likelyQuestions": string[], "storiesToUse": string[], "researchAreas": string[] },
  "keywords": string[]       // ATS keywords to weave into tailored CV
}

Be honest. If the role is below the user's bar, score it truthfully. The user's rule is: never apply below 4.0.
`.trim();

export function buildEvaluationUserMessage(args: {
  profile: Record<string, unknown>;
  cv: string;
  jobTitle: string;
  jobCompany: string;
  jobDescription: string;
  jobUrl?: string | null;
}) {
  return [
    `## Candidate profile`,
    "```json",
    JSON.stringify(args.profile, null, 2),
    "```",
    ``,
    `## Candidate CV (markdown)`,
    "```markdown",
    args.cv,
    "```",
    ``,
    `## Job posting`,
    `- Company: ${args.jobCompany}`,
    `- Title: ${args.jobTitle}`,
    args.jobUrl ? `- URL: ${args.jobUrl}` : "",
    ``,
    `### Description`,
    args.jobDescription,
    ``,
    `## Rubric weights`,
    "```json",
    JSON.stringify(RUBRIC, null, 2),
    "```",
    ``,
    `Produce the JSON evaluation now.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const TAILOR_CV_SYSTEM = `
You rewrite the candidate's markdown CV to maximise ATS fit for a specific role.

Rules:
- Preserve truth. Do not invent experience, companies, dates, or credentials.
- Reorder bullets so the most job-relevant ones appear first in each section.
- Replace generic verbs with stronger ones where the underlying work supports it.
- Weave in the ATS keywords where they honestly apply.
- Keep it to a crisp 1-2 page length.
- Output ONLY the rewritten markdown CV. No commentary, no code fences.
`.trim();

export function buildTailorUserMessage(args: {
  baseCv: string;
  jobTitle: string;
  jobCompany: string;
  jobDescription: string;
  keywords: string[];
}) {
  return [
    `## Base CV`,
    args.baseCv,
    ``,
    `## Target role`,
    `${args.jobTitle} at ${args.jobCompany}`,
    ``,
    `## JD`,
    args.jobDescription,
    ``,
    `## ATS keywords to weave in (only if truthful)`,
    args.keywords.join(", "),
    ``,
    `Return the rewritten markdown CV only.`,
  ].join("\n");
}
