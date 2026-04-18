import Link from "next/link";

export function NavBar() {
  return (
    <nav className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="font-mono text-sm font-bold tracking-tight">
          careerops
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="hover:text-accent">Dashboard</Link>
          <Link href="/jobs" className="hover:text-accent">Jobs</Link>
          <Link href="/evaluations" className="hover:text-accent">Evaluations</Link>
          <Link href="/evaluations/new" className="hover:text-accent">New</Link>
          <Link href="/scan" className="hover:text-accent">Scan</Link>
          <Link href="/profile" className="hover:text-accent">Profile</Link>
          <Link href="/cv" className="hover:text-accent">CV</Link>
          <form action="/api/auth/logout" method="post">
            <button className="text-neutral-500 hover:text-red-600" type="submit">
              Logout
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
