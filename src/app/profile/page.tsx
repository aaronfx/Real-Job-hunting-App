import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function save(formData: FormData) {
  "use server";
  const data = {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    location: str(formData.get("location")),
    archetype: str(formData.get("archetype")),
    yearsExperience: num(formData.get("yearsExperience")),
    salaryMinUsd: num(formData.get("salaryMinUsd")),
    salaryTargetUsd: num(formData.get("salaryTargetUsd")),
    workAuth: str(formData.get("workAuth")),
    workPreference: str(formData.get("workPreference")),
    dealbreakers: str(formData.get("dealbreakers")),
    strengths: str(formData.get("strengths")),
    weaknesses: str(formData.get("weaknesses")),
    targetRoles: String(formData.get("targetRoles") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
  const existing = await prisma.profile.findFirst();
  if (existing) {
    await prisma.profile.update({ where: { id: existing.id }, data });
  } else {
    await prisma.profile.create({ data });
  }
  revalidatePath("/profile");
  redirect("/profile?saved=1");
}

function str(v: FormDataEntryValue | null): string | null {
  const s = v ? String(v).trim() : "";
  return s || null;
}
function num(v: FormDataEntryValue | null): number | null {
  const s = v ? String(v).trim() : "";
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const sp = await searchParams;
  const p = await prisma.profile.findFirst();
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      {sp.saved && (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Saved.
        </div>
      )}
      <form action={save} className="space-y-4">
        <Row label="Full name" name="fullName" defaultValue={p?.fullName} required />
        <Row label="Email" name="email" defaultValue={p?.email} required />
        <Row label="Location" name="location" defaultValue={p?.location ?? ""} />
        <Row
          label="Archetype (e.g. 'backend engineer', 'forex educator')"
          name="archetype"
          defaultValue={p?.archetype ?? ""}
        />
        <Row
          label="Target roles (comma-separated)"
          name="targetRoles"
          defaultValue={p?.targetRoles?.join(", ") ?? ""}
        />
        <div className="grid grid-cols-3 gap-3">
          <Row label="Years experience" name="yearsExperience" defaultValue={p?.yearsExperience ?? ""} />
          <Row label="Salary min (USD)" name="salaryMinUsd" defaultValue={p?.salaryMinUsd ?? ""} />
          <Row label="Salary target (USD)" name="salaryTargetUsd" defaultValue={p?.salaryTargetUsd ?? ""} />
        </div>
        <Row label="Work auth" name="workAuth" defaultValue={p?.workAuth ?? ""} />
        <Row label="Work preference (remote/hybrid/onsite)" name="workPreference" defaultValue={p?.workPreference ?? ""} />
        <Area label="Dealbreakers" name="dealbreakers" defaultValue={p?.dealbreakers ?? ""} />
        <Area label="Strengths" name="strengths" defaultValue={p?.strengths ?? ""} />
        <Area label="Weaknesses" name="weaknesses" defaultValue={p?.weaknesses ?? ""} />
        <button className="rounded bg-ink px-4 py-2 text-white">Save profile</button>
      </form>
    </div>
  );
}

function Row({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="w-full rounded border border-neutral-300 px-3 py-2"
      />
    </div>
  );
}
function Area({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={3}
        className="w-full rounded border border-neutral-300 px-3 py-2"
      />
    </div>
  );
}
