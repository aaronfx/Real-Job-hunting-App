/**
 * Pre-configured public ATS endpoints. These are official JSON APIs - no scraping.
 *
 * Greenhouse: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
 * Ashby:      https://api.ashbyhq.com/posting-api/job-board/{slug}
 * Lever:      https://api.lever.co/v0/postings/{slug}?mode=json
 *
 * The user can add/remove via the /scan page in the UI.
 */

export type PortalSeed = {
  company: string;
  kind: "greenhouse" | "ashby" | "lever";
  slug: string;
};

export const SEED_PORTALS: PortalSeed[] = [
  { company: "Anthropic", kind: "greenhouse", slug: "anthropic" },
  { company: "OpenAI", kind: "greenhouse", slug: "openai" },
  { company: "Mistral", kind: "ashby", slug: "mistral" },
  { company: "Retool", kind: "ashby", slug: "retool" },
  { company: "Linear", kind: "ashby", slug: "linear" },
  { company: "Vercel", kind: "greenhouse", slug: "vercel" },
  { company: "Replicate", kind: "ashby", slug: "replicate" },
  { company: "Hugging Face", kind: "lever", slug: "huggingface" },
  { company: "Stripe", kind: "greenhouse", slug: "stripe" },
  { company: "Notion", kind: "greenhouse", slug: "notion" },
];

export type NormalizedJob = {
  externalId: string;
  url: string;
  title: string;
  location: string;
  remote: boolean;
  description: string; // plain or HTML
};

export async function fetchGreenhouse(slug: string): Promise<NormalizedJob[]> {
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`,
  );
  if (!res.ok) throw new Error(`Greenhouse ${slug}: ${res.status}`);
  const data = (await res.json()) as { jobs: any[] };
  return data.jobs.map((j) => ({
    externalId: String(j.id),
    url: j.absolute_url,
    title: j.title,
    location: j.location?.name ?? "",
    remote: /remote/i.test(j.location?.name ?? ""),
    description: j.content ?? "",
  }));
}

export async function fetchAshby(slug: string): Promise<NormalizedJob[]> {
  const res = await fetch(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`,
  );
  if (!res.ok) throw new Error(`Ashby ${slug}: ${res.status}`);
  const data = (await res.json()) as { jobs: any[] };
  return (data.jobs ?? []).map((j) => ({
    externalId: String(j.id),
    url: j.jobUrl,
    title: j.title,
    location: j.location ?? "",
    remote: !!j.isRemote,
    description: j.descriptionPlain ?? j.descriptionHtml ?? "",
  }));
}

export async function fetchLever(slug: string): Promise<NormalizedJob[]> {
  const res = await fetch(
    `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`,
  );
  if (!res.ok) throw new Error(`Lever ${slug}: ${res.status}`);
  const data = (await res.json()) as any[];
  return data.map((j) => ({
    externalId: String(j.id),
    url: j.hostedUrl,
    title: j.text,
    location: j.categories?.location ?? "",
    remote: /remote/i.test(j.categories?.location ?? ""),
    description: j.descriptionPlain ?? j.description ?? "",
  }));
}

export async function fetchPortal(kind: string, slug: string): Promise<NormalizedJob[]> {
  if (kind === "greenhouse") return fetchGreenhouse(slug);
  if (kind === "ashby") return fetchAshby(slug);
  if (kind === "lever") return fetchLever(slug);
  throw new Error(`Unknown portal kind: ${kind}`);
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
