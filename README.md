# CareerOps Cloud

An AI-powered job-search co-pilot you run on your own laptop. Inspired by
[santifer/career-ops](https://github.com/santifer/career-ops).

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
├── docker-compose.yml      # Local Postgres + Redis containers
└── .github/workflows/      # Daily scan + CI
```

Three pieces that run on your laptop:

1. **Web app** (Next.js) — the UI you open at `http://localhost:3000`
2. **Worker** (BullMQ) — background process that runs Claude evaluations,
   scans portals, generates PDFs
3. **Postgres + Redis** — data stores, running in Docker containers

## Quickstart for Windows (non-developers welcome)

Budget: ~30 minutes the first time. After that, starting the app is two
commands.

### One-time setup

**1. Install Docker Desktop**

- Download from https://www.docker.com/products/docker-desktop/
- Run the installer. Reboot if asked.
- Open Docker Desktop at least once so it finishes setup.
- Keep it running in the background whenever you use CareerOps.

**2. Install Node.js (LTS)**

- Download from https://nodejs.org/ — click the big "LTS" button.
- Run the installer, click Next through every screen.

**3. Install Git**

- Download from https://git-scm.com/download/win
- Run the installer, click Next through every screen.

**4. Get an Anthropic API key**

- Go to https://console.anthropic.com/ → sign up or log in
- Settings → API Keys → Create Key — copy the `sk-ant-...` string somewhere
  safe. This is how your app talks to Claude.

**5. Clone the repo**

Open **Command Prompt** (press Windows key, type "cmd", hit Enter) and run:

```bat
cd %USERPROFILE%\Documents
git clone https://github.com/aaronfx/Real-Job-hunting-App.git
cd Real-Job-hunting-App
```

**6. Start the databases**

```bat
docker compose up -d
```

This downloads and starts Postgres and Redis. First time takes a minute.
You'll see `[+] Running 3/3` when it's done.

**7. Install app dependencies**

```bat
npm install
```

Takes 2–3 minutes the first time.

**8. Create your `.env` file**

Copy `.env.example` to `.env` (in the same folder), then open `.env` in
Notepad. Paste in these values:

```
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
DATABASE_URL=postgres://careerops:careerops@localhost:5432/careerops
REDIS_URL=redis://localhost:6379
APP_PASSWORD=pick-any-password-you-like
SESSION_SECRET=tXd1DE2B7hloZth0SkR_rhD6mgMBnlVUiAM1D7o-Hes
CLAUDE_MODEL=claude-sonnet-4-6
NODE_ENV=development
```

(The SESSION_SECRET above is a pre-generated random string — fine to use.)

**9. Create the database tables**

```bat
npx prisma db push
```

You should see `Your database is now in sync with your Prisma schema`.

### Every time you want to use the app

Open **two** Command Prompt windows. Both should be in the project folder
(`cd %USERPROFILE%\Documents\Real-Job-hunting-App`).

**Window 1 — web app:**

```bat
docker compose up -d
npm run dev
```

**Window 2 — background worker:**

```bat
npm run worker
```

Leave both running. Open http://localhost:3000 in your browser.

### First-use flow

1. Log in with the `APP_PASSWORD` you chose
2. **Profile** → fill it in → Save
3. **CV** → paste your CV in markdown format → Save
4. **Scan** → click **Seed defaults** to add 10 companies → **Scan all now**
5. Or jump straight to **New** → paste any job description → **Run evaluation**

Evaluation takes 15–40 seconds. The page auto-refreshes.

### Shutting down

Close both Command Prompt windows. Then optionally:

```bat
docker compose down
```

This stops Postgres and Redis. Your data sticks around. Use
`docker compose down -v` to wipe the data too.

## If something breaks

**`docker compose up` errors with "Docker Desktop is not running"**
→ Open Docker Desktop app, wait for the whale icon to stop animating, retry.

**`npm run dev` errors with `Can't reach database server`**
→ Run `docker compose up -d` first. Postgres must be up.

**Evaluations stay "running" forever**
→ The worker isn't running. Open the second terminal and
`npm run worker`.

**`Missing required env var: ANTHROPIC_API_KEY`**
→ Your `.env` is missing, has a typo, or isn't in the project root. Double
check it exists next to `package.json`.

**Prisma errors about `libquery_engine`**
→ Run `npx prisma generate` and try again.

## Cost

- Docker Desktop: free for personal use
- Postgres, Redis, Node: all free
- Anthropic API: pay as you go, ~2–5 cents per job evaluation. A month
  of 100 evaluations ≈ a few dollars.
- Your electricity: trivial

## Extending

Portal scanners live in `src/lib/portals.ts`. Add more ATS integrations
by adding a `fetch{Name}` function and wiring it into `fetchPortal`.

The 10-dimension scoring rubric lives in `src/lib/claude.ts`. Tweak
weights, add dimensions, or replace the system prompt entirely.

## If you later want to put it online

Every scaffold file for cloud deployment is still in the repo
(`railway.json`, `Dockerfile.worker`, `.github/workflows/`). You can
deploy to Railway, Render, Fly.io, or any other Node host when you're
ready. The easiest paid option is Railway's Hobby plan at $5/mo. The
easiest free option is Vercel + Neon (Postgres) + Upstash (Redis).

## Credits

- Design inspired by [santifer/career-ops](https://github.com/santifer/career-ops)
- Built with Next.js, Prisma, BullMQ, Playwright, Puppeteer, and the
  Anthropic API.
