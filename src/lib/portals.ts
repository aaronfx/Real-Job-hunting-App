/**
 * Pre-configured public ATS endpoints. These are official JSON APIs - no scraping.
 *
 * Greenhouse:      https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
 * Ashby:           https://api.ashbyhq.com/posting-api/job-board/{slug}
 * Lever:           https://api.lever.co/v0/postings/{slug}?mode=json
 * Workable:        https://apply.workable.com/api/v3/accounts/{slug}/jobs
 * SmartRecruiters: https://api.smartrecruiters.com/v1/companies/{slug}/postings
 *
 * The user can add/remove via the /scan page in the UI.
 */

export type PortalKind =
  | "greenhouse"
  | "ashby"
  | "lever"
  | "workable"
  | "smartrecruiters"
  | "remoteok";

export type PortalSeed = {
  company: string;
  kind: PortalKind;
  slug: string;
};

export const SEED_PORTALS: PortalSeed[] = [
  // --- Fintech / trading / crypto (most relevant for forex/trading-adjacent roles) ---
  // These companies use Greenhouse, Ashby, or Lever — CareerOps can auto-scan them.
  // For the broader list of 100+ FX brokers, prop firms, and trading-education
  // companies (most of which need manual checking), see BROKERS.md.

  // Crypto / digital-asset trading platforms (verified working)
  { company: "Coinbase", kind: "greenhouse", slug: "coinbase" },
  { company: "Gemini", kind: "greenhouse", slug: "gemini" },
  { company: "ConsenSys", kind: "greenhouse", slug: "consensys" },
  { company: "Polymarket", kind: "ashby", slug: "polymarket" },

  // Retail brokerages and trading apps (verified working)
  { company: "Robinhood", kind: "greenhouse", slug: "robinhood" },
  { company: "Public.com", kind: "greenhouse", slug: "public" },

  // Payments / fintech with frequent analytics / content openings (verified working)
  { company: "Stripe", kind: "greenhouse", slug: "stripe" },
  { company: "Brex", kind: "greenhouse", slug: "brex" },
  { company: "Ramp", kind: "ashby", slug: "ramp" },
  { company: "Mercury", kind: "ashby", slug: "mercury" },
  { company: "Chime", kind: "greenhouse", slug: "chime" },
  { company: "Nubank", kind: "greenhouse", slug: "nubank" },

  // AI / tech
  { company: "Anthropic", kind: "greenhouse", slug: "anthropic" },
  { company: "OpenAI", kind: "greenhouse", slug: "openai" },
  { company: "Mistral", kind: "ashby", slug: "mistral" },
  { company: "Hugging Face", kind: "lever", slug: "huggingface" },
  { company: "Notion", kind: "greenhouse", slug: "notion" },
  { company: "Vercel", kind: "greenhouse", slug: "vercel" },
  { company: "Linear", kind: "ashby", slug: "linear" },
  { company: "Retool", kind: "ashby", slug: "retool" },
  { company: "Replicate", kind: "ashby", slug: "replicate" },

  // RemoteOK — huge aggregator of remote roles across categories. The
  // "slug" here is a comma-separated list of tags. Use "all" to get every
  // remote job (warning: thousands). Add more rows with your own tag mixes.
  { company: "RemoteOK · AI", kind: "remoteok", slug: "ai,ml,llm,ai-engineer" },
  { company: "RemoteOK · Marketing", kind: "remoteok", slug: "marketing,content,copywriting,seo" },
  { company: "RemoteOK · Design", kind: "remoteok", slug: "design,ux,ui,product-design" },
  { company: "RemoteOK · Finance & Crypto", kind: "remoteok", slug: "finance,fintech,crypto,trading" },
  { company: "RemoteOK · Non-tech", kind: "remoteok", slug: "non-tech,customer-support,operations,community,hr,recruiting" },
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

export async function fetchWorkable(slug: string): Promise<NormalizedJob[]> {
  const res = await fetch(
    `https://apply.workable.com/api/v3/accounts/${encodeURIComponent(slug)}/jobs?limit=200`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Workable ${slug}: ${res.status}`);
  const data = (await res.json()) as { results?: any[] };
  return (data.results ?? []).map((j) => {
    const loc = [j.city, j.region, j.country].filter(Boolean).join(", ");
    return {
      externalId: String(j.shortcode ?? j.id),
      url: j.url ?? j.application_url ?? "",
      title: j.title ?? "",
      location: loc,
      remote: !!(j.telecommuting || j.remote || /remote/i.test(loc)),
      description: [j.description, j.requirements, j.benefits]
        .filter(Boolean)
        .join("\n\n"),
    };
  });
}

export async function fetchSmartRecruiters(slug: string): Promise<NormalizedJob[]> {
  // List endpoint — paginated. Grab first 100, which is plenty for most companies.
  const listRes = await fetch(
    `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=100`,
  );
  if (!listRes.ok) throw new Error(`SmartRecruiters ${slug}: ${listRes.status}`);
  const list = (await listRes.json()) as { content?: any[] };
  const postings = list.content ?? [];

  // Each posting's description lives on the per-item endpoint. Fetch in
  // parallel but cap concurrency to be polite.
  const results: NormalizedJob[] = [];
  const limit = 5;
  for (let i = 0; i < postings.length; i += limit) {
    const slice = postings.slice(i, i + limit);
    const detailed = await Promise.all(
      slice.map(async (p) => {
        try {
          const r = await fetch(
            `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings/${encodeURIComponent(p.id)}`,
          );
          if (!r.ok) return null;
          const d = (await r.json()) as any;
          const sections = d.jobAd?.sections ?? {};
          const description = Object.values(sections)
            .map((s: any) => `${s?.title ?? ""}\n${s?.text ?? ""}`)
            .join("\n\n");
          const loc = [
            d.location?.city,
            d.location?.region,
            d.location?.country,
          ]
            .filter(Boolean)
            .join(", ");
          return {
            externalId: String(d.id),
            url: d.ref ?? `https://jobs.smartrecruiters.com/${slug}/${d.id}`,
            title: d.name ?? "",
            location: loc,
            remote: !!d.location?.remote || /remote/i.test(loc),
            description,
          } as NormalizedJob;
        } catch {
          return null;
        }
      }),
    );
    for (const d of detailed) if (d) results.push(d);
  }
  return results;
}

export async function fetchRemoteOK(slug: string): Promise<NormalizedJob[]> {
  const res = await fetch(`https://remoteok.com/api`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "CareerOps/1.0 (personal job tracker)",
    },
  });
  if (!res.ok) throw new Error(`RemoteOK: ${res.status}`);
  const data = (await res.json()) as any[];

  // First element is legal metadata, skip. Real jobs have an id.
  const all = data.filter((j) => j && j.id);

  // Slug is a comma-separated tag list. "all" means no filter.
  const filter = slug.toLowerCase().trim();
  const tagList = filter === "all" || !filter
    ? null
    : filter.split(",").map((s) => s.trim()).filter(Boolean);

  const filtered = !tagList
    ? all
    : all.filter((j: any) => {
        const jobTags: string[] = Array.isArray(j.tags)
          ? j.tags.map((t: string) => String(t).toLowerCase())
          : [];
        const title = String(j.position ?? j.title ?? "").toLowerCase();
        const position = String(j.position ?? "").toLowerCase();
        return tagList.some(
          (t) =>
            jobTags.includes(t) ||
            title.includes(t) ||
            position.includes(t.replace(/-/g, " ")),
        );
      });

  return filtered.map((j: any) => {
    const tags: string[] = Array.isArray(j.tags) ? j.tags : [];
    return {
      externalId: String(j.id),
      url: j.url || j.apply_url || `https://remoteok.com/remote-jobs/${j.slug ?? j.id}`,
      title: j.position || j.title || "Role",
      location: j.location || "Remote",
      remote: true,
      description:
        (j.description || "") +
        (tags.length ? `\n\nTags: ${tags.join(", ")}` : ""),
    };
  });
}

export async function fetchPortal(kind: string, slug: string): Promise<NormalizedJob[]> {
  if (kind === "greenhouse") return fetchGreenhouse(slug);
  if (kind === "ashby") return fetchAshby(slug);
  if (kind === "lever") return fetchLever(slug);
  if (kind === "workable") return fetchWorkable(slug);
  if (kind === "smartrecruiters") return fetchSmartRecruiters(slug);
  if (kind === "remoteok") return fetchRemoteOK(slug);
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
