<p align="center">
  <img src="frontend/src/app/favicon.ico" alt="Auto Mailer logo" width="120" />
</p>

<h1 align="center">Auto Mailer</h1>

<p align="center">
  Standalone email campaign and automation service. Referenced by <strong>CoreKnot</strong> for transactional email dispatch.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/visibility-public-brightgreen" alt="Public repository" />
  <img src="https://img.shields.io/badge/maintained-yes-blue" alt="Maintained" />
  <img src="https://img.shields.io/badge/owner-RaghavSobti37-111827" alt="Owner" />
</p>

---

## Overview

Auto-Mailer is a standalone service that handles:
- **Transactional emails** — password resets, invite notifications, system alerts (consumed by CoreKnot)
- **Campaign emails** — bulk email outreach with tracking (open/click pixels, unsubscribe)
- **Email streams** — automated follow-ups and sequences
- **Analytics & tracking** — open/click/bounce tracking with Resend webhooks

It runs independently of CoreKnot and is referenced via a single environment variable (`AUTO_MAILER_API_URL`).

---

## Quick Start

### Prerequisites

- **Node.js 20+**
- **MongoDB 7** (local: `docker compose up -d`)
- **Redis 7** (optional for queues; in-memory fallback exists)
- **Resend account** (for email delivery)
- **SMTP credentials** (optional fallback)

### Local Development

```bash
# 1. Clone
git clone https://github.com/RaghavSobti37/Auto-Mailer.git
cd Auto-Mailer

# 2. Start MongoDB + Redis (Docker)
docker compose up -d

# 3. Configure environment
cp .env.example .env
# Edit .env: set RESEND_API_KEY, MONGODB_URI, COREKNOT_MAIL_BRIDGE_SECRET

# 4. Install & run
npm install
npm run dev          # starts on http://localhost:5001
```

### Verify It Works

```bash
# Health check (no DB required)
curl http://localhost:5001/health

# Service info
curl http://localhost:5001/
```

---

## Deploy to Render

Auto-Mailer is designed to deploy on **Render** as a standalone web service.

### One-click deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

Or use `render.yaml` (Infrastructure as Code) — create a new **Blueprint** in your Render dashboard and point it at this repo.

### Manual setup

1. **Create a Web Service** on Render
   - **Name:** `automailer-api`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free tier works for low volume

2. **Required environment variables:**

| Variable | Purpose | Example |
|----------|---------|---------|
| `MONGODB_URI` | MongoDB Atlas URI | `mongodb+srv://user:pass@cluster/auto-mailer` |
| `RESEND_API_KEY` | Resend email delivery | `re_xxxxxxxxxxxx` |
| `COREKNOT_MAIL_BRIDGE_SECRET` | Shared secret for CoreKnot auth | Generate with `openssl rand -hex 32` |
| `NODE_VERSION` | Node runtime version | `20` |

3. **Optional environment variables:**

| Variable | Purpose | Default |
|----------|---------|---------|
| `REDIS_URL` | Redis for campaign queues | In-memory fallback |
| `TRACKING_BASE_URL` | Public URL for tracking pixels | `https://your-service.onrender.com` |
| `RESEND_WEBHOOK_SECRET` | Resend webhook verification | — |
| `SMTP_USER` / `SMTP_PASS` | SMTP fallback when Resend is down | — |
| `FRONTEND_URL` | CORS origin for frontend UI | `*` |
| `ONLINE_BACKUP_MONGODB_URI` | Backup destination URI | — |

4. **Health check:** Render will use `GET /health` — returns `{"status":"ok"}`

5. **After deploy:** Note your Render URL (e.g. `https://automailer-api.onrender.com`)

---

## Linking Auto-Mailer with CoreKnot

CoreKnot delegates transactional email dispatch to Auto-Mailer. The integration is a **loose reference** — CoreKnt simply makes HTTP POST requests to Auto-Mailer's transactional endpoint.

### On CoreKnot's Render API, set:

```env
# The URL of your deployed Auto-Mailer instance
AUTO_MAILER_API_URL=https://your-automailer-api.onrender.com

# Shared secret — must match COREKNOT_MAIL_BRIDGE_SECRET on Auto-Mailer
AUTO_MAILER_INTERNAL_TOKEN=your-shared-secret
```

### How it works

```
CoreKnot (invite email) 
  → POST /api/auth/forgot-password 
  → mailDriver.js 
  → POST <AUTO_MAILER_API_URL>/api/transactional/send 
    (Authorization: Bearer <AUTO_MAILER_INTERNAL_TOKEN>)
  → Auto-Mailer validates secret
  → Auto-Mailer dispatches via Resend or SMTP
  → Returns { queued: true, provider: 'resend' }
```

### Verification

```bash
# From CoreKnot's server, test the link
curl -X POST https://your-automailer-api.onrender.com/api/transactional/send \
  -H "Authorization: Bearer your-shared-secret" \
  -H "Content-Type: application/json" \
  -d '{"to":["test@example.com"],"subject":"Test","html":"<p>Hello</p>"}'
# Expected: 202 {"queued":true,"provider":"resend","id":"email_..."}
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check (DB + uptime) |
| `GET` | `/` | Service metadata |
| `POST` | `/api/transactional/send` | Send transactional email (requires `Authorization: Bearer <secret>`) |
| `GET` | `/api/system/health` | Detailed system health (Mongo, Redis, campaign counts) |
| `GET` | `/api/config` | Service configuration |
| `POST` | `/api/mail/test-campaign` | Send test campaign email |
| `GET` | `/api/mail/stats` | Mail analytics |

Full API: see `server/app/registerRoutes.js`.

---

## Running Tests

```bash
npm test
```

Runs: backup self-check → mail self-check → transactional self-check → audience read self-check → syntax check on all core files.

---

## Project Structure

```
auto-mailer/
├── server/
│   ├── server.js              # Entry point
│   ├── config.js              # Environment configuration
│   ├── app/
│   │   ├── createApp.js       # Express app (cors, helmet, body parsing)
│   │   └── registerRoutes.js  # All routes (health, mail, campaigns, etc.)
│   ├── services/
│   │   ├── mailDriver.js      # Email dispatch (Resend → SMTP fallback)
│   │   ├── mailService.js     # Campaign email logic (tracking, personalization)
│   │   └── campaignEmailQueue.js  # BullMQ campaign queue
│   ├── routes/
│   │   ├── transactionalRouter.js  # CoreKnot integration endpoint
│   │   ├── campaignsRouter.js      # Campaign CRUD
│   │   └── campaignApiRouter.js    # Campaign API
│   ├── models/                # Mongoose models
│   └── workers/               # BullMQ workers
├── frontend/                  # Next.js admin UI (separate deploy on Vercel)
├── scripts/                   # Self-checks, migrations, utilities
├── render.yaml                # Render Blueprint IaC
├── docker-compose.yml         # Local MongoDB + Redis
└── .env.example               # Environment template
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5001` | Server port |
| `MONGODB_URI` | Yes | `mongodb://localhost:27017/auto-mailer` | MongoDB connection |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis (in-memory fallback) |
| `RESEND_API_KEY` | No* | — | Resend API key for email delivery |
| `SMTP_USER` / `SMTP_PASS` | No* | — | SMTP fallback credentials |
| `COREKNOT_MAIL_BRIDGE_SECRET` | No* | — | Shared secret for CoreKnot auth |
| `TRACKING_BASE_URL` | No | `http://localhost:5001` | Public base URL for tracking |
| `FRONTEND_URL` | No | `http://localhost:5001` | CORS origin |
| `CORS_ORIGIN` | No | `*` | CORS allowed origins |
| `SYSTEM_VERIFIED_FROM_EMAIL` | No | `onboarding@resend.dev` | Default sender email |
| `ONLINE_BACKUP_MONGODB_URI` | No | — | Backup destination |

*\* At least one email provider (Resend or SMTP) required for sending.*

---

## Updating the Auto-Mailer README

This `README.md` is committed alongside the code and auto-published on Render. Keep these files in sync:

- `.env.example` — template for required env vars
- `render.yaml` — infrastructure as code for Render deploy
- `README.md` — developer onboarding + operator runbook

---

## Author

Built and maintained by [Raghav Raj Sobti](https://github.com/RaghavSobti37).

**Repository:** https://github.com/RaghavSobti37/Auto-Mailer
