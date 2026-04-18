import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EvaluationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const e = await prisma.evaluation.findUnique({
    where: { id },
    include: { job: true, application: true },
  });
  if (!e) notFound();

  const dims = (e.dimensions as Record<string, { score: number; note: string }> | null) ?? {};

  return (
    <div className="space-y-6">
      <header>
        <Link href="/evaluations" className="text-sm text-neutral-500 hover:underline">
          ← All evaluations
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {e.job.title} <span className="text-neutral-500">· {e.job.company}</span>
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {e.job.location || "—"} · {e.status} · {new Date(e.createdAt).toLocaleString()}
        </p>
      </header>

      {e.status === "running" && (
        <RefreshHint />
      )}

      {e.status === "error" && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Evaluation failed.</strong>
          <pre className="mt-2 whitespace-pre-wrap">{e.errorMessage}</pre>
        </div>
      )}

      {e.status === "done" && (
        <>
          <section className="grid grid-cols-3 gap-4">
            <Card title="Score"><Big>{e.score.toFixed(1)}</Big></Card>
            <Card title="Grade"><Big>{e.grade}</Big></Card>
            <Card title="Recommendation"><Big>{e.recommendation}</Big></Card>
          </section>

          <Section title="Role summary" data={e.roleSummary} />
          <Section title="CV match" data={e.cvMatch} />
          <Section title="Level strategy" data={e.levelStrategy} />
          <Section title="Compensation" data={e.compensation} />
          <Section title="Personalization" data={e.personalization} />
          <Section title="Interview prep" data={e.interviewPrep} />

          {Object.keys(dims).length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">
                Dimension scores
              </h2>
              <table className="w-full border border-neutral-200 bg-white text-sm">
                <tbody>
                  {Object.entries(dims).map(([k, v]) => (
                    <tr key={k} className="border-b last:border-b-0 border-neutral-200">
                      <td className="w-48 px-3 py-2 font-mono text-xs">{k}</td>
                      <td className="w-16 px-3 py-2 font-mono">{v.score.toFixed(1)}</td>
                      <td className="px-3 py-2 text-neutral-600">{v.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {e.keywords.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">
                ATS keywords
              </h2>
              <p className="text-sm">{e.keywords.join(", ")}</p>
            </section>
          )}

          <section className="flex gap-3">
            <a
              href={`/api/jobs/${e.id}/pdf`}
              className="rounded bg-ink px-3 py-2 text-sm text-white"
            >
              Download tailored CV (PDF)
            </a>
          </section>
        </>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-neutral-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Big({ children }: { children: React.ReactNode }) {
  return <p className="text-2xl font-semibold">{children}</p>;
}

function Section({ title, data }: { title: string; data: unknown }) {
  if (!data) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">
        {title}
      </h2>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-neutral-200 bg-white p-3 text-sm">
        {JSON.stringify(data, null, 2)}
      </pre>
    </section>
  );
}

function RefreshHint() {
  return (
    <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      Evaluation in progress — this page auto-refreshes every few seconds.
      <script
        dangerouslySetInnerHTML={{
          __html: `setTimeout(() => location.reload(), 4000)`,
        }}
      />
    </div>
  );
}
