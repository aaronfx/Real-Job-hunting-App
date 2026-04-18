"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewEvaluationPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      url: String(form.get("url") ?? "").trim() || null,
      company: String(form.get("company") ?? "").trim(),
      title: String(form.get("title") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
    };
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to start evaluation");
      }
      const { evaluationId } = await res.json();
      router.push(`/evaluations/${evaluationId}`);
    } catch (err: any) {
      setError(err.message ?? "Unknown error");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Evaluate a job</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Company" name="company" required />
        <Field label="Title" name="title" required />
        <Field label="Job URL (optional)" name="url" type="url" />
        <div>
          <label className="mb-1 block text-sm font-medium">Description / JD</label>
          <textarea
            name="description"
            required
            rows={16}
            className="w-full rounded border border-neutral-300 px-3 py-2 font-mono text-sm"
            placeholder="Paste the full job description here..."
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-ink px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? "Starting…" : "Run evaluation"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        className="w-full rounded border border-neutral-300 px-3 py-2"
      />
    </div>
  );
}
