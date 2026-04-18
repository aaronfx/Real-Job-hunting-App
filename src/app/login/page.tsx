export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  return (
    <div className="mx-auto mt-24 max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <h1 className="mb-1 text-xl font-semibold">CareerOps</h1>
      <p className="mb-4 text-sm text-neutral-500">
        Enter your app password to continue.
      </p>
      <form action="/api/auth/login" method="post" className="space-y-3">
        <input
          type="hidden"
          name="next"
          defaultValue={searchParams.next ?? "/dashboard"}
        />
        <input
          type="password"
          name="password"
          required
          autoFocus
          placeholder="app password"
          className="w-full rounded border border-neutral-300 px-3 py-2"
        />
        <button
          type="submit"
          className="w-full rounded bg-ink px-3 py-2 text-white hover:opacity-90"
        >
          Sign in
        </button>
        {searchParams.error && (
          <p className="text-sm text-red-600">Wrong password.</p>
        )}
      </form>
    </div>
  );
}
