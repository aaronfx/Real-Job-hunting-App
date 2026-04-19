"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "url" | "manual";

export default function NewEvaluationPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("url");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitUrl(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const url = String(form.get("url") ?? "").trim();
    try {
      const res = await fetch("/api/evaluate-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const { evaluationId } = await res.json();
      router.push(`/evaluations/${evaluationId}`);
    } catch (err: any) {
      setError(err.message ?? "Unknown error");
      setSubmitting(false);
    }
  }

  async function submitManual(e: React.FormEvent<HTMLFormElement>) {
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

      <div className="flex gap-2 border-b border-neutral-200">
        <TabButton active={mode === "url"} onClick={() => setMode("url")}>
          Paste URL
        </TabButton>
        <TabButton active={mode === "manual"} onClick={() => setMode("manual")}>
          Paste manually
        </TabButton>
      </div>

      {mode === "url" ? (
        <form onSubmit={submitUrl} className="space-y-4">
          <p className="text-sm text-neutral-600">
            Paste a link to any job posting — a broker's career page, a prop firm's site,
            Indeed, RemoteOK, etc. Claude reads the page and extracts the details.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium">Job URL</label>
            <input
              type="url"
              name="url"
              required
              autoFocus
              placeholder="https://ftmo.com/en/careers/role/..."
              className="w-full rounded border border-neutral-300 px-3 py-2"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-ink px-4 py-2 text-white disabled:opacity-50"
          >
            {submitting ? "Fetching page…" : "Evaluate from URL"}
          </button>
          <p className="text-xs text-neutral-500">
            Works on most public career pages. LinkedIn blocks bots and some sites
            load listings via JavaScript — if a URL fails, switch to <b>Paste manually</b>.
          </p>
        </form>
      ) : (
        <form onSubmit={submitManual} className="space-y-4">
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
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-ink text-ink"
          : "border-transparent text-neutral-500 hover:text-ink"
      }`}
    >
      {children}
    </button>
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
