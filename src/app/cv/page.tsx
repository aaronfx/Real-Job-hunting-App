import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function save(formData: FormData) {
  "use server";
  const markdown = String(formData.get("markdown") ?? "");
  await prisma.cV.upsert({
    where: { label: "default" },
    create: { label: "default", markdown },
    update: { markdown },
  });
  revalidatePath("/cv");
  redirect("/cv?saved=1");
}

export default async function CvPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const sp = await searchParams;
  const cv = await prisma.cV.findUnique({ where: { label: "default" } });
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Your CV (markdown)</h1>
      <p className="text-sm text-neutral-500">
        This is the base CV. Each evaluation generates a tailored version for that specific job.
      </p>
      {sp.saved && (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Saved.
        </div>
      )}
      <form action={save} className="space-y-3">
        <textarea
          name="markdown"
          defaultValue={cv?.markdown ?? ""}
          rows={30}
          className="w-full rounded border border-neutral-300 px-3 py-2 font-mono text-xs"
          placeholder="# Your Name&#10;&#10;## Experience&#10;&#10;### Job title at Company&#10;- bullet"
        />
        <button className="rounded bg-ink px-4 py-2 text-white">Save CV</button>
      </form>
    </div>
  );
}
