# CareerOps Cloud

A self-hosted, AI-powered job-search co-pilot. Inspired by
[santifer/career-ops](https://github.com/santifer/career-ops), but redesigned
as a web app you deploy to **Railway** with a **GitHub**-driven workflow.

You paste a job posting. Claude evaluates it across 10 weighted dimensions,
tells you whether to apply, rewrites your CV to match, and generates a
tailored PDF — all stored in your own Postgres database.

## What's inside

```
careerops-cloud/
├── src/                    # Next.js 15 web app (App Router)
│   ├── app/                # Pages + API routes
│   ├── components/
│   └── lib/                # Claude, DB, queue, portals
├── worker/                 # Background worker (BullMQ)
│   └── src/jobs/           # evaluate / scan / pdf
├── prisma/schema.prisma    # Database model
├── .github/workflows/      # Daily scan + CI
├── Dockerfile.worker       # Container for worker service
├── railway.json            # Web service config
└── railway.worker.json     # Worker service config
```

Two Railway services, one repo:

1. **web** — Next.js app (the UI + API routes)
2. **worker** — BullMQ consumer (scans portals, calls Claude, renders PDFs)

Plus Railway plugins: **Postgres** and **Redis**.

## What you need before deploying

1. An Anthropic API key — sign up at https://console.anthropic.com/
2. A Railway account — sign up at https://railway.app/
3. The GitHub repo this code is pushed to

## Deployment walkthrough

### 1. Deploy the web service

1. Go to Railway → **New Project** → **Deploy from GitHub repo** →
   select your repo.
2. In the new service's **Settings**, leave the builder on Nixpacks. Railway
   will pick up `railway.json`.
3. In **Variables**, add everything from `.env.example`:
   - `ANTHROPIC_API_KEY`
   - `APP_PASSWORD` — the password you'll type to log in
   - `SESSION_SECRET` — a random 32+ char string
   - `CRON_SECRET` — another random string
   - `CLAUDE_MODEL` — defaults to `claude-sonnet-4-6` (fine to leave unset)
   - `NODE_ENV=production`
4. Add the **Postgres plugin** — Railway auto-wires `DATABASE_URL`.
5. Add the **Redis plugin** — Railway auto-wires `REDIS_URL`.
6. Expose the service (Settings → Networking → Generate Domain). Copy
   that URL into `PUBLIC_APP_URL` as a variable.

On first deploy, `railway.json`'s `startCommand` runs `prisma migrate deploy`
to create tables, then boots Next.js.

### 2. Deploy the worker service

1. In the same Railway project, **+ New** → **GitHub Repo** → pick the same repo.
2. In the new service's **Settings**, set the **Config Path** to
   `railway.worker.json`. (Or override the Dockerfile to
   `Dockerfile.worker`.)
3. Copy the same env vars from the web service (Railway has a "Reference"
   feature to share them — use it for `DATABASE_URL`, `REDIS_URL`,
   `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`).

### 3. Wire up the scheduled scan

In your GitHub repo → **Settings → Secrets and variables → Actions**, add:

- `PUBLIC_APP_URL` — your Railway web URL (e.g. `https://careerops.up.railway.app`)
- `CRON_SECRET` — the same value you set in Railway

The workflow in `.github/workflows/scheduled-scan.yml` runs every day at
07:30 UTC and hits `/api/cron/scan`. You can also trigger it manually from
the Actions tab.

### 4. First run

1. Open the Railway web URL. You'll see the login page.
2. Enter `APP_PASSWORD`.
3. Go to **Profile**, fill it in, save.
4. Go to **CV**, paste your markdown CV, save.
5. Go to **Scan** → **Seed defaults** to add 10 companies. Click
   **Scan all now** to pull current openings.
6. Or skip all that and go straight to **New** → paste any job description
   → click **Run evaluation**.

You'll be taken to the evaluation page; it polls until Claude finishes
(usually 15–40 seconds). Once done, you can download the tailored CV PDF.

## Local development

```
cp .env.example .env
# fill in at minimum ANTHROPIC_API_KEY, APP_PASSWORD, SESSION_SECRET,
# DATABASE_URL (local Postgres), REDIS_URL (local Redis)
npm install
npx prisma migrate dev
npm run dev              # terminal 1 - web
npm run worker           # terminal 2 - background worker
```

Hit http://localhost:3000.

## Costs & limits

- **Railway**: roughly $5–20/mo for this setup (web + worker + Postgres + Redis)
- **Anthropic API**: ~2–5 cents per evaluation. 100 evals ≈ a few dollars.
- **GitHub Actions**: scheduled scans use free-tier minutes.

## Security notes

- This is a **single-user** system. One password, no multi-tenant.
- Rotate `SESSION_SECRET` and `APP_PASSWORD` if either leaks.
- PDFs are written to the worker container's filesystem by default —
  for durability, swap `worker/src/jobs/pdf.ts` to upload to S3/R2.

## Extending

Portal scanners live in `src/lib/portals.ts`. Add more ATS integrations
by adding a `fetch{Name}` function and wiring it into `fetchPortal`.

The 10-dimension rubric lives in `src/lib/claude.ts`. Tweak weights,
add dimensions, or replace the system prompt entirely to match your
own hiring instincts.

## Roadmap

- [ ] S3/R2 PDF storage
- [ ] Interview story library auto-populated from evaluations
- [ ] Salary comp research tool
- [ ] Webhook/email notifications for high-scoring jobs
- [ ] Multi-profile support (for job searches in different tracks)
