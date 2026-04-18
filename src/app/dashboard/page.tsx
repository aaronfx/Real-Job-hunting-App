import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [evalCount, recent, pipeline] = await Promise.all([
    prisma.evaluation.count(),
    prisma.evaluation.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { job: true, application: true },
    }),
    prisma.application.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link
          href="/evaluations/new"
          className="rounded bg-ink px-3 py-1.5 text-sm text-white"
        >
          + Evaluate a job
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total evaluations" value={evalCount} />
        <Stat
          label="In pipeline"
          value={pipeline
            .filter((p) => !["rejected", "withdrawn", "not-applied"].includes(p.status))
            .reduce((a, b) => a + b._count._all, 0)}
        />
        <Stat
          label="Offers"
          value={pipeline.find((p) => p.status === "offer")?._count._all ?? 0}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Recent evaluations
        </h2>
        <ul className="divide-y divide-neutral-200 rounded border border-neutral-200 bg-white">
          {recent.length === 0 && (
            <li className="px-4 py-6 text-sm text-neutral-500">
              No evaluations yet. Start with{" "}
              <Link href="/evaluations/new" className="underline">
                a new one
              </Link>
              .
            </li>
          )}
          {recent.map((e) => (
            <li key={e.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <Link
                  href={`/evaluations/${e.id}`}
                  className="block truncate font-medium hover:underline"
                >
                  {e.job.title} <span className="text-neutral-400">·</span>{" "}
                  <span className="text-neutral-600">{e.job.company}</span>
                </Link>
                <p className="text-xs text-neutral-500">
                  {new Date(e.createdAt).toLocaleString()} · {e.status}
                </p>
              </div>
              <ScorePill score={e.score} grade={e.grade} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-neutral-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function ScorePill({ score, grade }: { score: number; grade: string }) {
  const color =
    score >= 4.5
      ? "bg-emerald-100 text-emerald-800"
      : score >= 4.0
      ? "bg-green-100 text-green-800"
      : score >= 3.0
      ? "bg-amber-100 text-amber-800"
      : "bg-red-100 text-red-800";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-mono ${color}`}>
      {grade} · {score.toFixed(1)}
    </span>
  );
}
