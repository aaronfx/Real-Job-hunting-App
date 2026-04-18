import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function JobsBrowser({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    company?: string;
    page?: string;
    remote?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const q = (sp.q ?? "").trim();
  const company = (sp.company ?? "").trim();
  const remoteOnly = sp.remote === "1";

  const where: any = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (company) where.company = { equals: company };
  if (remoteOnly) where.remote = true;

  const [jobs, total, companies] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { evaluations: { select: { id: true, score: true, grade: true } } },
    }),
    prisma.job.count({ where }),
    prisma.job.groupBy({
      by: ["company"],
      _count: { _all: true },
      orderBy: { _count: { company: "desc" } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <p className="text-sm text-neutral-500">
          {total.toLocaleString()} job{total === 1 ? "" : "s"} scanned
        </p>
      </header>

      <form className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_240px_auto_auto]">
        <input
          name="q"
          placeholder="Search title or description..."
          defaultValue={q}
          className="rounded border border-neutral-300 px-3 py-2"
        />
        <select
          name="company"
          defaultValue={company}
          className="rounded border border-neutral-300 px-3 py-2"
        >
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c.company} value={c.company}>
              {c.company} ({c._count._all})
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="remote" value="1" defaultChecked={remoteOnly} />
          Remote only
        </label>
        <button type="submit" className="rounded bg-ink px-4 py-2 text-white">
          Filter
        </button>
      </form>

      <ul className="divide-y divide-neutral-200 rounded border border-neutral-200 bg-white">
        {jobs.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-neutral-500">
            No jobs match. Try a different filter, or run a Scan from the Scan page.
          </li>
        )}
        {jobs.map((job) => {
          const latestEval = job.evaluations[0];
          return (
            <li key={job.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {job.url && job.url.startsWith("http") ? (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium hover:underline"
                    >
                      {job.title}
                    </a>
                  ) : (
                    <span className="font-medium">{job.title}</span>
                  )}
                  {job.remote && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                      remote
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-neutral-600">
                  <span className="font-medium">{job.company}</span>
                  {job.location && ` · ${job.location}`}
                  {job.source && ` · ${job.source}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {latestEval ? (
                  <Link
                    href={`/evaluations/${latestEval.id}`}
                    className="rounded bg-neutral-100 px-3 py-1.5 text-xs font-mono hover:bg-neutral-200"
                  >
                    {latestEval.grade} · {latestEval.score.toFixed(1)}
                  </Link>
                ) : (
                  <form action={`/api/jobs/${job.id}/evaluate`} method="post">
                    <button
                      type="submit"
                      className="rounded bg-ink px-3 py-1.5 text-xs text-white hover:opacity-90"
                    >
                      Evaluate
                    </button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 && (
        <nav className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              className="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100"
              href={buildHref({ ...sp, page: String(page - 1) })}
            >
              ← Prev
            </Link>
          ) : (
            <span />
          )}
          <span className="text-neutral-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              className="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100"
              href={buildHref({ ...sp, page: String(page + 1) })}
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

function buildHref(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v.length) qs.set(k, v);
  }
  return `/jobs?${qs.toString()}`;
}
