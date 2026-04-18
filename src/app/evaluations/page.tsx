import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EvaluationsList() {
  const evaluations = await prisma.evaluation.findMany({
    orderBy: { createdAt: "desc" },
    include: { job: true, application: true },
  });
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">All evaluations</h1>
      <ul className="divide-y divide-neutral-200 rounded border border-neutral-200 bg-white">
        {evaluations.length === 0 && (
          <li className="px-4 py-6 text-sm text-neutral-500">Nothing yet.</li>
        )}
        {evaluations.map((e) => (
          <li key={e.id} className="flex items-center justify-between px-4 py-3">
            <Link href={`/evaluations/${e.id}`} className="min-w-0 flex-1 truncate hover:underline">
              <span className="font-medium">{e.job.title}</span>{" "}
              <span className="text-neutral-500">· {e.job.company}</span>
            </Link>
            <div className="flex items-center gap-3 text-sm text-neutral-600">
              <span className="font-mono">{e.grade} · {e.score.toFixed(1)}</span>
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">{e.status}</span>
              <span>{e.application?.status ?? "—"}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
