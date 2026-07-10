# Auto-Mailer — Email Campaign & Automation Service

A standalone, single-tenant email campaign service with batch sending, open/click tracking, unsubscribe handling, Resend webhooks, and a local data hub for audience analytics. Migrated from CoreKnot — designed to be deployed independently or alongside the main platform.

---

## Architecture

```
┌──────────────┐     ┌───────────────┐     ┌────────────┐
│  Campaign    │────▶│  Email Queue   │────▶│  Resend    │
│  Controller  │     │  (BullMQ /     │     │  API       │
│              │     │   Direct)      │     │            │
└──────────────┘     └───────┬───────┘     └─────┬──────┘
                             │                    │
                             ▼                    ▼
                      ┌──────────────┐    ┌──────────────┐
                      │  MongoDB     │    │  Resend      │
                      │  (Campaigns, │    │  Webhooks    │
                      │   Logs,      │    │  (Delivery,  │
                      │   Events)    │    │   Bounce)    │
                      └──────────────┘    └──────────────┘
```

### Key Design Decisions

- **Batch send → Batch track**: All emails are sent first (no per-email DB writes), then tracking events are created in a single `insertMany` after. This avoids tracking queue overhead during send.
- **BullMQ (Redis) optional**: Falls back to direct batch processing if Redis is unavailable.
- **Single-tenant**: No tenant/user scopes. Connects to the same MongoDB as CoreKnot but operates independently.
- **Tracking**: Open/click pixels embedded in HTML. Resend webhooks handle delivery/bounce events.

---

## Quick Start

### 1. Prerequisites

- **Node.js** v18+
- **MongoDB** 7+ (local via Docker or cloud Atlas)
- **Resend** account (for sending emails) — [resend.com](https://resend.com)
- **Docker Desktop** (recommended for local MongoDB)

### 2. Setup

```bash
cd auto-mailer

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 3. Configure Environment

Edit `.env` with your settings:

```bash
# Required — your Resend API key
RESEND_API_KEY=re_xxxxxxxxxxxx

# MongoDB — Docker local or Atlas
MONGODB_URI=mongodb://localhost:27017/auto-mailer

# Optional — Redis for BullMQ queue
REDIS_URL=redis://localhost:6379

# Optional — online MongoDB backup destination
ONLINE_BACKUP_MONGODB_URI=
BACKUP_SCHEDULE_HOUR=2

# Frontend URL (for unsubscribe redirects)
FRONTEND_URL=http://localhost:5173
```

### 4. Start Local Data Services (Docker)

```bash
# Start MongoDB 7 and Redis in background
docker compose up -d

# Verify they are running
docker ps
```

MongoDB stores the local Auto Mailer Data Hub on this laptop at `mongodb://localhost:27017/auto-mailer`.
Redis powers BullMQ email queues; Auto Mailer still falls back to direct batch processing if Redis is unavailable.

### 5. Run the Server

```bash
# Standard start
node server/server.js

# Or with auto-restart on changes
npm run dev
```

Server starts on **`http://localhost:5001`**.

Open **`http://localhost:5001`** in a browser for the standalone Auto Mailer console. It includes:

- Email campaign/API shortcuts
- Data Hub health and sync controls
- **Boot Docker + Sync Data Hub** button for local MongoDB/Redis
- AiSensy CSV upload for WhatsApp campaign outcomes

Verify:

```bash
curl http://localhost:5001/health
# → {"status":"ok","service":"auto-mailer","timestamp":"..."}
```

---

## Full API Reference

### Health & Config

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/config` | Service metadata |

### Campaigns (`/api/mail/campaigns`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mail/campaigns` | List campaigns |
| POST | `/api/mail/campaigns` | Create campaign |
| POST | `/api/mail/campaigns/:id/send` | Send campaign |
| DELETE | `/api/mail/campaigns/:id` | Delete campaign |

### Campaign API (`/api/mail/campaign-api`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mail/campaign-api` | List all campaigns |
| GET | `/api/mail/campaign-api/:id` | Get campaign by ID |
| GET | `/api/mail/campaign-api/:id/analytics` | Campaign analytics |
| POST | `/api/mail/campaign-api/:id/dispatch` | **Dispatch campaign send** — triggers batch email sending |
| POST | `/api/mail/campaign-api/:id/stop` | Stop a sending campaign |
| POST | `/api/mail/campaign-api` | Create campaign |
| DELETE | `/api/mail/campaign-api/:id` | Delete campaign |

### Templates (`/api/mail/templates`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mail/templates` | List templates |
| GET | `/api/mail/templates/pending` | List pending approval templates |
| POST | `/api/mail/templates/save-draft` | Save draft template |
| GET | `/api/mail/templates/:id` | Get template by ID |
| POST | `/api/mail/templates/:id/submit` | Submit for approval |
| POST | `/api/mail/templates/:id/approve` | Approve template |
| POST | `/api/mail/templates/:id/reject` | Reject template |
| DELETE | `/api/mail/templates/:id` | Delete template |

### Email Profiles (`/api/mail/profiles`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mail/profiles` | List sender profiles |
| POST | `/api/mail/profiles` | Create profile |
| PUT | `/api/mail/profiles/:id` | Update profile |
| DELETE | `/api/mail/profiles/:id` | Delete profile |

### Analytics (`/api/mail/analytics`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mail/analytics/stats` | Aggregate campaign stats |

### Email Streams (`/api/mail/streams`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mail/streams` | List email streams |
| GET | `/api/mail/streams/:slug` | Get stream details |

### HolySheet Unsubscribe Sync (`/api/mail/holysheet`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mail/holysheet/unsubscribes` | Fetch unsubscribes |
| POST | `/api/mail/holysheet/unsubscribes` | Push unsubscribe |

### Tracking (Embedded Pixels)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/track/open/:campaignId/:recipientId.gif` | **Open tracking pixel** (returns 1×1 transparent GIF) |
| GET | `/track/click/:campaignId/:trackingId` | **Click tracking** (redirects to target URL) |
| GET | `/track/unsubscribe/:campaignId/:trackingId` | Unsubscribe page redirect |
| POST | `/track/unsubscribe/:campaignId/:trackingId` | Process unsubscribe |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/resend` | **Resend event webhook** (delivery, bounce, complaint) |
| GET | `/webhooks/health` | Webhook health check |

### Data Hub (`/api/data-hub`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data-hub/folders` | List audience folders |
| GET | `/api/data-hub/people` | List people with search/filter |
| GET | `/api/data-hub/people/:id` | **Person 360° view** (campaigns, events, timeline) |
| POST | `/api/data-hub/people/bulk-delete` | Remove people from hub |
| GET | `/api/data-hub/analytics` | Aggregate hub analytics |
| GET | `/api/data-hub/analytics/overlap` | Audience overlap analysis |
| GET | `/api/data-hub/campaign-outcomes` | List WhatsApp/AiSensy campaign outcome summaries |
| GET | `/api/data-hub/campaign-outcomes/:campaignName/recipients` | List recipients for one WhatsApp campaign |
| POST | `/api/data-hub/campaign-outcomes/import` | Upload AiSensy campaign CSV |
| GET | `/api/data-hub/sync-status` | Sync status |
| POST | `/api/data-hub/reconcile` | **Sync campaign recipients** into EmailLog |
| POST | `/api/data-hub/rebuild-person-hub` | Rebuild EmailLog from all campaign data |
| POST | `/api/data-hub/backup/run` | Run an on-demand local MongoDB to online MongoDB backup |

### Local System (`/api/system`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system/status` | Docker compose and Mongo connection status |
| POST | `/api/system/docker/up` | Start Docker Desktop if needed, then run `docker compose up -d` |
| POST | `/api/system/local-data/start-and-sync` | Start Docker services and sync Data Hub inlets |

---

## Email Sending Pipeline

### How Sending Works

1. **`POST /api/mail/campaign-api/:id/dispatch`** is called
2. `campaignEmailQueue.js` checks for Redis:
   - **With Redis (BullMQ)**: Jobs are queued for each recipient, processed concurrently (concurrency: 5)
   - **Without Redis**: Batch processing is used
3. **Batch flow (recommended, no Redis):**
   - `batchSendEmails()` sends ALL pending emails in a loop
   - Recipient statuses and campaign metrics are updated in-memory only
   - Campaign is saved **once** after all sends complete
   - `batchCreateTrackingEvents()` creates all `MailEvent` entries in a single `insertMany`
4. **Tracking pixels** are embedded in the HTML — opens/clicks fire asynchronously when recipients interact

### Batch Performance

| Recipients | Send Time (1000) | Events Created |
|------------|------------------|----------------|
| 1,000      | ~30-60s          | 1 insertMany   |
| 10,000     | ~5-10 min        | 1 insertMany   |
| 50,000     | ~25-50 min       | 1 insertMany   |

*Times depend on Resend API latency and network.*

---

## Data Hub

The Data Hub provides a unified view of all campaign recipients across `Campaign`, `MailCampaign`, `MailEvent`, and `EmailLog` models.

### Models Used

| Model | Collection | Purpose |
|-------|-----------|---------|
| `Campaign` | `campaigns` | Core campaign with recipients array |
| `MailCampaign` | `mailcampaigns` | Additional mail campaign type |
| `EmailLog` | `emaillogs` | Unified recipient tracking |
| `MailEvent` | `mailevents` | Open/click/delivery/bounce events |

### Data Flow

```
Campaign/MailCampaign recipients
        │
        ▼
  syncAllInlets()  ──►  EmailLog (deduplicated)
        │
        ▼
  MailEvent (tracking)
        │
        ▼
  Data Hub API (360° view, analytics)
```

### Running a Sync

```bash
# Reconcile all campaign recipients into EmailLog
curl -X POST http://localhost:5001/api/data-hub/reconcile

# Check sync status
curl http://localhost:5001/api/data-hub/sync-status
```

### Daily Online Backup

Auto Mailer keeps the Data Hub locally in Docker MongoDB and can mirror it once per day to an online MongoDB server. Set `ONLINE_BACKUP_MONGODB_URI` in `.env`; the app schedules a daily backup at `BACKUP_SCHEDULE_HOUR` and stores run metadata in `_auto_mailer_backup_runs`.

```bash
# Run a manual backup immediately
npm run backup:data-hub

# Or trigger it through the local API
curl -X POST http://localhost:5001/api/data-hub/backup/run
```

If `ONLINE_BACKUP_MONGODB_URI` is not set, the backup job is skipped and the API returns a clear configuration message. Do not commit the online MongoDB URI.

### AiSensy CSV Import

Export one campaign segment CSV from AiSensy and upload it from the Auto Mailer console or API:

```bash
curl -F "file=@/path/to/campaign-read-audience.csv" \
  -F "campaignName=Campaign Name" \
  http://localhost:5001/api/data-hub/campaign-outcomes/import
```

Supported columns include `Name`, `Mobile Number`, `Phone`, `WhatsApp Number`, `Email`, `Status`, `Sent At`, `Delivered At`, `Read At`, `Clicked At`, `Failure Reason`, and `Tags`. If no status column is present, Auto Mailer infers status from the filename, such as `failed`, `delivered`, `read`, `clicked`, or `replied`.

---

## .env Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | ✅ | `mongodb://localhost:27017/auto-mailer` | MongoDB connection string |
| `RESEND_API_KEY` | ✅ | — | Resend API key for sending |
| `PORT` | ❌ | `5001` | Server port |
| `FRONTEND_URL` | ❌ | `http://localhost:5173` | Frontend URL for unsubscribe redirects |
| `REDIS_URL` | ❌ | `redis://localhost:6379` | Redis for BullMQ queue |
| `ONLINE_BACKUP_MONGODB_URI` | ❌ | — | Online MongoDB backup destination |
| `BACKUP_SCHEDULE_HOUR` | ❌ | `2` | Local-hour daily backup time, 0-23 |
| `RESEND_WEBHOOK_SECRET` | ❌ | — | Resend webhook verification secret |
| `SMTP_USER` | ❌ | — | SMTP fallback username |
| `SMTP_PASS` | ❌ | — | SMTP fallback password |
| `SYSTEM_VERIFIED_FROM_EMAIL` | ❌ | `onboarding@resend.dev` | Verified sender email |
| `HOLYSHEET_API_KEY` | ❌ | `Z2BhkUlsA5F-wq2GQ...` | HolySheet unsubscribe sync key |
| `CORS_ORIGIN` | ❌ | `*` | CORS allowed origin |

---

Additional production deployment variables:

| Variable | Purpose |
|----------|---------|
| `APP_BASE_URL` | Public backend URL, such as `https://automailer-api.onrender.com` |
| `TRACKING_BASE_URL` | Public URL used in outbound email open/click/unsubscribe links |
| `CORS_ORIGIN` | Comma-separated browser origins allowed to call the API |

## Deployment

### Docker

The included `docker-compose.yml` runs local MongoDB and Redis:

```bash
docker compose up -d
```

For full deployment, create a separate `docker-compose.prod.yml`:

```yaml
version: "3.8"
services:
  mongodb:
    image: mongo:7
    restart: always
    volumes:
      - mongo-data:/data/db
  auto-mailer:
    build: .
    ports:
      - "5001:5001"
    env_file: .env
    depends_on:
      - mongodb
volumes:
  mongo-data:
```

### Render

The current `render.yaml` Blueprint is authoritative for the new codebase:
- Web service: `automailer-api`
- Build Command: `npm ci`
- Start Command: `npm start`
- Health Check Path: `/health`
- Daily backup cron: `automailer-data-hub-backup`, running `npm run backup:data-hub` at `30 20 * * *` UTC

A `render.yaml` is included — deploy as a Web Service with:
- **Build Command:** `npm install`
- **Start Command:** `node server/server.js`
- **Health Check Path:** `/health`

### Environment Variables (Render)

Set all `.env` values as Render environment variables. MongoDB can be MongoDB Atlas or a Render-managed instance.

Production defaults in `render.yaml` assume:
- Render API: `https://automailer-api.onrender.com`
- Vercel console: `https://auto-mailer-raghavsobti37s-projects.vercel.app`
- `TRACKING_BASE_URL=https://automailer-api.onrender.com` so outbound email pixels and click links hit the API directly.

The cron service needs both `MONGODB_URI` and `ONLINE_BACKUP_MONGODB_URI`. If the online URI is not configured, the backup script exits with a clear skipped result.

### Vercel

`vercel.json` deploys the `public/` console as a static site and proxies runtime calls to Render:
- `/api/*` -> `https://automailer-api.onrender.com/api/*`
- `/track/*` -> `https://automailer-api.onrender.com/track/*`
- `/webhooks/*` -> `https://automailer-api.onrender.com/webhooks/*`
- `/health` -> `https://automailer-api.onrender.com/health`

The file sets `"framework": null`, `buildCommand: "npm run vercel:build"`, and `outputDirectory: "public"` so the existing Vercel project no longer tries to build this repo as Next.js.

---

## Development

```bash
# Watch mode
npm run dev

# Module load check
node -e "require('./server/server')"

# Full module health check
node -e "
['server/config','server/server','server/services/mailService','server/services/emailProcessor',
 'server/services/campaignEmailQueue','server/routes/index','server/routes/track',
 'server/webhooks/resendWebhookHandler'].forEach(m => {
   try { require('./' + m); console.log('OK:', m); }
   catch(e) { console.log('FAIL:', m, '-', e.message); }
})"
```

### Initial Data Hub Sync

After first startup with a populated MongoDB (campaign data already exists), run the data hub sync once to populate `EmailLog` from existing campaigns:

```bash
# Sync all campaign recipients into the unified EmailLog
curl -X POST http://localhost:5001/api/data-hub/reconcile

# Check sync status
curl http://localhost:5001/api/data-hub/sync-status
```

### Stress Testing

```bash
# Dry-run (simulated — no API calls, requires MongoDB)
node scripts/stress-test.js --count 100 --analytics

# Full suite: create → send → track → verify → cleanup
node scripts/stress-test.js --count 500 --all

# Live Resend test (SENDS REAL EMAILS)
node scripts/stress-test.js --count 50 --resend --domain yourdomain.com

# SMTP test
node scripts/stress-test.js --count 100 --no-dry-run --domain yourdomain.com
```

Options:
- `--count <n>` — Recipients (default: 100)
- `--campaign <id>` — Use existing campaign
- `--resend` — Send via Resend API
- `--analytics` — Verify analytics after send
- `--all` — Full suite
- `--cleanup` — Delete test data after run
- `--domain <d>` — Email domain (default: example.com)
- `--no-dry-run` — Actually call the send API

---

## Git Workflow

This project is part of the **TSC Platform** monorepo. To commit auto-mailer changes:

```bash
# From the TSC Platform root
cd ..

# Check which branch you're on
git branch

# Stage all auto-mailer files
git add auto-mailer/

# Commit with a descriptive message
git commit -m "feat: standalone auto-mailer service with batch email pipeline and data hub"

# Push to your remote
# (Use the appropriate remote and branch for your workflow)
git push origin <your-branch>
```

> **Note:** If there is no git repository initialized yet, create one first:
> ```bash
> git init
> git remote add origin <your-github-repo-url>
> ```

---

---

## File Structure

```
auto-mailer/
├── .env.example          # Environment template
├── docker-compose.yml    # MongoDB and Redis local setup
├── package.json
├── render.yaml           # Render deployment config
├── README.md             # ← You are here
│
├── server/
│   ├── server.js         # Entry point
│   ├── config.js         # Environment config
│   │
│   ├── app/
│   │   ├── createApp.js        # Express app factory
│   │   └── registerRoutes.js   # Route registration + health
│   │
│   ├── models/
│   │   ├── Campaign.js         # Campaign schema
│   │   ├── MailCampaign.js     # Mail campaign schema
│   │   ├── MailTemplate.js     # Email templates
│   │   ├── EmailProfile.js     # Sender profiles (SMTP/Resend)
│   │   ├── EmailLog.js         # Unified recipient log
│   │   └── MailEvent.js        # Open/click/delivery events
│   │
│   ├── routes/
│   │   ├── index.js            # Mail domain route aggregator
│   │   ├── campaignsRouter.js  # Campaign CRUD
│   │   ├── campaignApiRouter.js# Campaign API (dispatch, stop)
│   │   ├── templatesRouter.js  # Template management + approval
│   │   ├── profilesRouter.js   # Sender profiles
│   │   ├── analyticsRouter.js  # Campaign analytics
│   │   ├── streamsRouter.js    # Email streams
│   │   ├── holysheetRouter.js  # Unsubscribe sync
│   │   ├── track.js            # Open/click/unsubscribe tracking
│   │   └── webhookRoutes.js    # Resend webhooks
│   │
│   ├── controllers/
│   │   ├── campaignsController.js
│   │   ├── campaignApiController.js
│   │   ├── templatesController.js
│   │   ├── profilesController.js
│   │   ├── analyticsController.js
│   │   ├── audienceController.js
│   │   └── holysheetController.js
│   │
│   ├── services/
│   │   ├── mailService.js             # Email sending (Resend/SMTP)
│   │   ├── mailDriver.js              # Resend + SMTP transport
│   │   ├── emailProcessor.js          # Per-email + batch processing
│   │   ├── campaignEmailQueue.js      # Job dispatch + batch flow
│   │   ├── campaignQueueState.js      # Campaign stop state
│   │   ├── campaignEngagementService.js # Engagement resolution
│   │   ├── campaignAudienceService.js # Audience/list queries
│   │   ├── campaignFacade.js          # Campaign resolution
│   │   ├── emailStreamService.js      # Stream validation
│   │   ├── mailEventQueryService.js   # MailEvent queries
│   │   └── mailMetricsService.js      # Metrics aggregation
│   │
│   ├── domains/data-hub/
│   │   ├── routes.js                  # Data hub routes
│   │   ├── controllers/dataHubController.js
│   │   └── services/
│   │       ├── listService.js         # People listing
│   │       ├── personDetailService.js # Person 360° view
│   │       ├── analyticsService.js    # Hub analytics
│   │       ├── syncService.js         # Campaign → EmailLog sync
│   │       ├── deletePeopleService.js # Bulk deletion
│   │       └── repairService.js       # Dedup + rebuild
│   │
│   ├── workers/
│   │   └── campaignEmailWorker.js     # BullMQ worker
│   │
│   ├── webhooks/
│   │   └── resendWebhookHandler.js    # Resend event handler
│   │
│   └── utils/
│       ├── emailValidation.js
│       ├── emailTracker.js
│       ├── emailSignature.js
│       ├── emailContentUtils.js
│       ├── emailStreamUnsubscribe.js
│       ├── buildFinalEmailHtml.js
│       ├── normalizeOutboundEmailHtml.js
│       ├── campaignStats.js
│       └── ...
│
└── scripts/
    └── stress-test.js     # Bulk email + analytics stress test
```
