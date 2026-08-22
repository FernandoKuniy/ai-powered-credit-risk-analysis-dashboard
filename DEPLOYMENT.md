# Deployment Guide

## Environment Variables Setup

### Backend (Render)

Set these environment variables in your Render service dashboard:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret

# CORS Configuration  
ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000

# Optional API Key (leave empty for MVP)
API_KEY=your-secret-api-key
```

### Frontend (Vercel)

Set these environment variables in your Vercel project settings:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API Key (same as backend if using)
API_KEY=your-secret-api-key
```

## Supabase Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note your project URL and anon key

2. **Run Database Schema**
   - Go to SQL Editor in Supabase dashboard
   - Copy and paste the contents of `supabase-schema.sql`
   - Execute the SQL to create tables

3. **Get Credentials**
   - Project URL: Found in Settings > API
   - Anon Key: Found in Settings > API (public anon key)
   - **JWT Secret**: Found in Settings > API > JWT Secret section
     - This is required for the backend to verify user authentication tokens
     - Without it, JWT verification will be disabled (not recommended for production)
     - Copy the entire JWT secret value (it's a long string starting with `eyJ...`)

## Deployment Steps

### 1. Deploy Backend to Render

1. Connect your GitHub repository to Render
2. Create new Web Service
3. Configure:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - Environment: Python 3.11
4. Set environment variables (see above)
5. Deploy

### 2. Deploy Frontend to Vercel

1. Connect your GitHub repository to Vercel
2. Configure:
   - Framework: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build`
3. Set environment variables (see above)
4. Deploy

### 3. Update CORS Settings

After both deployments are complete:

1. Get your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Update `ALLOWED_ORIGINS` in Render with your Vercel URL
3. Redeploy backend

## Testing Deployment

1. **Test Backend Health**: `https://your-backend.onrender.com/health`
1. **Test Database Connectivity**: `https://your-backend.onrender.com/health/db` (should return `{"status":"ok","database":"reachable"}`)
2. **Test Scoring**: Submit a loan application on your Vercel site
3. **Test Dashboard**: Check if portfolio data loads
4. **Test Simulator**: Adjust threshold slider

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure `ALLOWED_ORIGINS` includes your Vercel URL
2. **Database Connection**: Verify Supabase URL and key are correct
3. **API Key Mismatch**: Ensure same `API_KEY` on both services
4. **Model Not Loading**: Check that `model.pkl` exists in backend
5. **JWT Verification Warnings**: If you see warnings about `SUPABASE_JWT_SECRET` not configured:
   - Ensure you've added the JWT secret to your backend environment variables
   - Verify the secret is copied correctly (it's a long string)
   - The application will still work but authentication verification will be disabled

### Health Check Endpoints

- Backend: `GET /health` - Shows model status and whether Supabase credentials are configured. Cheap and static; does **not** touch the database.
- Backend: `GET /health/db` - Runs a real (zero-row, RLS-empty) query against Postgres. Returns 503 if the database is unreachable. Used by the keep-warm workflow; see below.
- Frontend: Check browser console for API errors

## Keeping Free-Tier Services Awake

Two of the three hosts in this stack go to sleep when idle, and they sleep for
different reasons on very different timescales:

| Service | Idle behaviour | What resets the clock |
| --- | --- | --- |
| **Render** (backend) | Spins down after ~15 min with no traffic; next request pays a 45-60s cold start | Any HTTP request |
| **Supabase** (database) | Pauses a free project after **7 days** of no activity; requires a manual restore | A **database query** -- HTTP hits to the API gateway alone do not count |
| **Vercel** (frontend) | Does not idle-pause | n/a |

`.github/workflows/keep-warm.yml` handles the first two. Vercel needs nothing.

### How it works

The workflow pings `GET /health/db` on the Render backend. That single request
solves both problems at once: it is HTTP traffic (so Render stays up) and the
route runs a real `count` query against Postgres (so Supabase sees database
activity). A route returning a static `{"ok": true}` would keep Render warm but
would **not** stop the Supabase pause -- that distinction is the whole reason
`/health/db` exists separately from `/health`.

It also, optionally, pings Supabase's REST API directly. That is pure redundancy:
it keeps the 7-day protection alive even if the Render service is broken or
redeployed, so the watchdog does not depend on the thing it is watching.

### Why it pings in a loop instead of just using a tighter cron

GitHub throttles *scheduled* workflows heavily, so a `*/10` cron does not fire
every 10 minutes. Measured over 200 real runs of a `*/10` schedule in a sibling
project: **median gap 34 minutes, worst case 112**. Against Render's 15-minute
idle timer, a single ping per run would arrive after the instance had already
gone cold the large majority of the time.

The job itself is *not* throttled once it starts, so each run pings 7 times, 5
minutes apart, covering a continuous 30-minute window from the inside. This repo
is public, so Actions minutes are unmetered and the loop costs nothing.

> On a **private** repo this design would not be appropriate -- the 2,000
> min/month cap makes long-running loops untenable. Use an external uptime
> monitor (UptimeRobot, Better Stack, Cron-job.org) pointed at `/health/db`
> instead.

### Setup

Under **Settings > Secrets and variables > Actions**:

| Name | Kind | Required | Value |
| --- | --- | --- | --- |
| `KEEPWARM_BACKEND_URL` | Variable | yes | Render base URL, e.g. `https://your-backend.onrender.com` |
| `KEEPWARM_SUPABASE_URL` | Variable | optional | `https://your-project.supabase.co` |
| `KEEPWARM_SUPABASE_ANON_KEY` | Secret | optional | The anon/publishable key |

The URL lives in a *variable* rather than a secret so it stays readable in run
logs -- a masked URL makes failures much harder to diagnose. If nothing is
configured the workflow no-ops with a warning instead of failing, so forks and
fresh clones are not broken by it.

Trigger a run manually from the Actions tab (**Keep Warm > Run workflow**) to
confirm setup; the job summary reports exactly what was pinged.

### Honest limitation

This reduces cold starts; it does not eliminate them.

Each run covers 30 minutes. Render tolerates 15 minutes of silence. So the
backend stays warm as long as consecutive runs start **less than ~45 minutes
apart**. The measured median gap of 34 minutes sits comfortably under that line,
but the measured worst case of 112 minutes does not -- during a throttling spike
the instance will go cold and the next visitor pays the 45-60s wake-up. Expect
this occasionally. Guaranteed warmth on Render is a paid-tier feature; if it
matters, an external monitor on a 5-minute schedule is more reliable than
GitHub's scheduler, and upgrading off the free tier is the only real fix.

For **Supabase** the margin is enormous rather than marginal: even heavily
throttled, pings land many times per day against a 7-day window. Treat the
pause risk there as solved.

### Why the cron is not inside Supabase

`pg_cron` + `pg_net` would give far better cadence than GitHub's scheduler, but
a **paused project stops running its own cron**, so it cannot be the mechanism
that prevents its own pause. `pg_net` is also fire-and-forget, so a broken ping
would fail silently. The watchdog has to live outside the thing it watches.

## Production Considerations

- **Required**: Set `SUPABASE_JWT_SECRET` in backend environment variables for proper authentication
- Set up proper API key rotation
- Enable Supabase Row Level Security for production
- Add rate limiting to prevent abuse
- Set up monitoring and alerting
- Consider caching for portfolio aggregates
