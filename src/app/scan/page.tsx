import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SEED_PORTALS } from "@/lib/portals";
import { scanQueue } from "@/lib/queue";

export const dynamic = "force-dynamic";

async function addPortal(formData: FormData) {
  "use server";
  const company = String(formData.get("company") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!company || !kind || !slug) return;
  await prisma.portal.upsert({
    where: { kind_slug: { kind, slug } },
    create: { company, kind, slug },
    update: { company },
  });
  revalidatePath("/scan");
}

async function seedPortals() {
  "use server";
  for (const p of SEED_PORTALS) {
    await prisma.portal.upsert({
      where: { kind_slug: { kind: p.kind, slug: p.slug } },
      create: p,
      update: { company: p.company },
    });
  }
  revalidatePath("/scan");
}

async function runScanAll() {
  "use server";
  const portals = await prisma.portal.findMany({ where: { enabled: true } });
  for (const p of portals) await scanQueue.add("scan", { portalId: p.id });
  redirect("/scan?queued=1");
}

async function togglePortal(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const portal = await prisma.portal.findUnique({ where: { id } });
  if (!portal) return;
  await prisma.portal.update({ where: { id }, data: { enabled: !portal.enabled } });
  revalidatePath("/scan");
}

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ queued?: string }>;
}) {
  const sp = await searchParams;
  const portals = await prisma.portal.findMany({ orderBy: { company: "asc" } });
  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Portals</h1>
        <div className="flex gap-2">
          <form action={seedPortals}>
            <button className="rounded border border-neutral-300 px-3 py-1.5 text-sm">
              Seed defaults
            </button>
          </form>
          <form action={runScanAll}>
            <button className="rounded bg-ink px-3 py-1.5 text-sm text-white">
              Scan all now
            </button>
          </form>
        </div>
      </header>

      {sp.queued && (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Scan queued. New jobs will appear under Evaluations.
        </div>
      )}

      <form action={addPortal} className="grid grid-cols-4 gap-2">
        <input name="company" placeholder="Company" className="rounded border border-neutral-300 px-3 py-2" required />
        <select name="kind" className="rounded border border-neutral-300 px-3 py-2" required>
          <option value="">ATS</option>
          <option value="greenhouse">Greenhouse</option>
          <option value="ashby">Ashby</option>
          <option value="lever">Lever</option>
        </select>
        <input name="slug" placeholder="board slug" className="rounded border border-neutral-300 px-3 py-2" required />
        <button className="rounded bg-ink px-3 py-2 text-white">Add</button>
      </form>

      <ul className="divide-y divide-neutral-200 rounded border border-neutral-200 bg-white">
        {portals.length === 0 && (
          <li className="px-4 py-6 text-sm text-neutral-500">No portals yet — click "Seed defaults".</li>
        )}
        {portals.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <span className="font-medium">{p.company}</span>{" "}
              <span className="font-mono text-neutral-500">{p.kind}/{p.slug}</span>
            </div>
            <div className="flex items-center gap-3 text-neutral-500">
              <span>{p.lastScan ? `last: ${new Date(p.lastScan).toLocaleString()}` : "never"}</span>
              <form action={togglePortal}>
                <input type="hidden" name="id" value={p.id} />
                <button className="rounded border border-neutral-300 px-2 py-1 text-xs">
                  {p.enabled ? "Disable" : "Enable"}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
