# Auto-Mailer

Single-tenant email campaign tool for local audience data, simple campaign tracking, banner uploads, and manual compressed online MongoDB backup.

## What It Does

- Compose campaigns with raw HTML or simple HTML fragments.
- Upload campaign banners through UploadThing, with local crop, zoom, and flexible aspect ratios.
- Send with Resend, environment SMTP, or saved sender profiles.
- Track opens with a pixel and clicks with redirected links.
- Track only engagement state and link target. City/location tracking is not collected.
- Keep campaign analytics plain: sent, opened, clicked, bounced, and hourly engagement rows.
- Store working data locally in MongoDB, with manual compressed backup to online MongoDB.

## Safety Notes

Keep the repo private, but do not commit live secrets. Private repos still leak through logs, forks, screenshots, dependency tools, and accidental remotes.

Use `.env` for real values and `.env.example` for placeholders. This repo already ignores `.env`.

If a live key was pasted into chat or committed earlier, rotate it in the provider dashboard.

## Make The GitHub Repo Private

With GitHub CLI:

```bash
gh repo edit RaghavSobti37/Auto-Mailer --visibility private --accept-visibility-change-consequences
```

If `gh` is not logged in:

```bash
gh auth login
```

## Local Setup

```bash
cd auto-mailer
npm install
npm install --prefix frontend
copy .env.example .env
```

Edit `.env` with real values:

```bash
MONGODB_URI=mongodb://localhost:27017/auto-mailer
ONLINE_BACKUP_MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/auto-mailer-backup

REDIS_URL=redis://localhost:6379

RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
SMTP_USER=
SMTP_PASS=

UPLOADTHING_TOKEN=eyJhcGlLZXkiOi...

AUTO_MAILER_API_KEY=

# Optional — legacy; personal single-user deploy has no frontend login gate.
PORT=5001
FRONTEND_URL=https://auto-mailer-blue.vercel.app
TRACKING_BASE_URL=https://auto-mailer-5e54.onrender.com
NEXT_PUBLIC_LIVE_API_URL=https://auto-mailer-5e54.onrender.com
NEXT_PUBLIC_MIRROR_API_URL=https://auto-mailer-5e54.onrender.com
```

Start local services:

```bash
docker compose up -d
```

**First-time: pull Atlas mail + data-hub into local Mongo**

```bash
npm run setup:local-mongo
# or: npm run migrate:to-local
# dry-run counts: node scripts/migrate-to-local.mjs --dry-run
# mail only: node scripts/migrate-to-local.mjs --only=mail
```

Source URI: `COREKNOT_MONGODB_URI` / `ATLAS_MONGODB_URI`, or `.env.render-backup.json` (gitignored).  
Target: `LOCAL_MONGODB_URI` / `MONGODB_URI` → `mongodb://localhost:27017/auto-mailer`.

Re-pull after prod changes:

```bash
npm run migrate:to-local
```

Run backend:

```bash
npm run dev
```

Run frontend:

```bash
npm run dev --prefix frontend
```

Open the frontend and create sender profiles and campaigns. No login screen — personal single-tenant use only; keep the repo private.

Production frontend:

```text
https://auto-mailer-blue.vercel.app
```

Production API (Render):

```text
https://auto-mailer-5e54.onrender.com
```

Local dev can still tunnel the API if needed, but production should use the Render URL above.

## Data ownership (CoreKnot decoupled)

- **Auto-Mailer** owns campaigns, templates, tracking, audience, analytics.
- **Audience** reads `personhubviews` in Mongo (legacy CoreKnot hub shape) — no mirror/sync worker.
- **Primary DB:** `MONGODB_URI` → local Docker Mongo (`auto-mailer` database).
- **Atlas source:** migration scripts read prod from `COREKNOT_MONGODB_URI` or `.env.render-backup.json`.
- **Online backup:** gzip EJSON chunks via Settings → **Back up to online Mongo** (`ONLINE_BACKUP_MONGODB_URI`; can match primary DB on Atlas M0).
- CoreKnot `/api/data-hub`, `/api/campaigns`, `/api/track` return **410 Gone** → use Auto-Mailer.

Migration (when Atlas has collection headroom):

```bash
npm run migrate:from-coreknot
```


Service: `Auto-Mailer` (`srv-d7istknaqgkc73a4rv70`) — repo root, **not** CoreKnot `Taskmaster/server`.

**Warning:** Render `PUT /v1/services/{id}/env-vars` **replaces the entire env set**. Never send a single key; always send the full list.

1. Keep secrets in gitignored `.env.render-backup.json` (see `.env.render-backup.json.example`).
2. Restore env + redeploy:

```bash
node scripts/restore-render-env.mjs
```

3. If builds fail with missing `Taskmaster/server`, reset service paths:

```bash
node scripts/fix-render-service-config.mjs
```

Requires `RENDER_API_KEY` (see `coreknot/.cursor/render-api.local.env`).

## Email Provider Setup

Resend path:

1. Add `RESEND_API_KEY`.
2. Set `SYSTEM_VERIFIED_FROM_EMAIL` to a verified sender/domain.
3. Add Resend webhook URL:

```text
https://<your-backend-domain>/webhooks/resend
```

SMTP path:

1. Add `SMTP_USER` and `SMTP_PASS`.
2. Or create sender profiles in the UI with SMTP host, port, user, and password.

## UploadThing Setup

1. Create an UploadThing app.
2. Put the real `UPLOADTHING_TOKEN` in `.env` and in frontend hosting env vars.
3. Use Campaigns -> New campaign -> Banner.
4. Choose an image, aspect ratio, and zoom.
5. Click `Upload banner`.

The UI uploads a cropped JPEG and stores only the returned URL on the campaign.

## Campaign Test Send

The new campaign screen pre-fills these test recipients:

```text
raghavsobti37@gmail.com
raghavishaan@gmail.com
Harshika@theshakticollective.in
```

Use `Send test` before dispatching. The backend sends one test email addressed to those three recipients through the configured provider.

## Sending And Tracking Behavior

Send path:

1. Campaign dispatch marks the campaign as queued/sending.
2. Redis/BullMQ sends recipient jobs concurrently when Redis is available.
3. Without Redis, the direct fallback sends every pending email first, saves campaign status once, then inserts send/bounce events in bulk.
4. Open and click tracking HTTP responses return immediately.
5. Open/click DB writes are queued behind the response so sending work gets priority.

Tracking scope:

- Open: pixel loaded or not loaded.
- Click: clicked or not clicked, with target URL for link tracking.
- No city, country, IP analytics, or location breakdown.

Tracking link format:

- Opens: `${TRACKING_BASE_URL}/track/open/:campaignId/:recipientId.gif?email=:recipientEmail`
- Clicks: `${TRACKING_BASE_URL}/track/click/:campaignId/:recipientId?url=:encodedTargetUrl&email=:recipientEmail`
- Unsubscribe: `${TRACKING_BASE_URL}/track/unsubscribe/:campaignId/:recipientId?email=:recipientEmail`

## Backup

Run compressed online backup from the Settings page with **Back up now**, or from CLI:

```bash
npm run backup:data-hub
```

Backups are manual-only. The local MongoDB database stays the source of truth; the online MongoDB database stores gzip-compressed Extended JSON chunks in `_auto_mailer_backup_chunks`, with run metadata in `_auto_mailer_backup_runs`.

## Verify

Backend:

```bash
npm test
```

Frontend:

```bash
npm run lint --prefix frontend
npm run build --prefix frontend
```

## Production Checklist

- Repo visibility is private.
- `.env` is not committed.
- `FRONTEND_URL` points to the public backend URL used in email links.
- `TRACKING_BASE_URL` points to the public backend/API URL used in open, click, and unsubscribe links.
- Resend sender/domain is verified.
- UploadThing token is set in frontend hosting.
- MongoDB Atlas IP/network access is restricted where possible.
- Test campaign succeeds before bulk dispatch.
