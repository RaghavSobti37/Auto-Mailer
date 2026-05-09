# AutoMailer Production Deployment Guide

This guide covers how to deploy the AutoMailer application to **Render** (Monolith with Background Jobs) or **Vercel** (Serverless).

## 🚀 Recommended: Render (Monolith)

Render is the best choice for AutoMailer because it supports persistent background threads for sending emails and scanning bounces.

### 🛠 Setup Steps
1.  **Create a New Web Service** on Render.
2.  **Connect your Repository**.
3.  **Configure Environment**:
    - **Runtime**: `Python 3`
    - **Build Command**: `pip install -r requirements.txt`
    - **Start Command**: `gunicorn web_app:app --worker-class sync --workers 1 --bind 0.0.0.0:$PORT`
    - *(Note: Use `--workers 1` to ensure campaign state remains consistent in memory, or use a persistent DB if scaling).*
4.  **Add Environment Variables** in the Render Dashboard:
    - `EMAIL_ADDRESS`: Your primary sender email.
    - `EMAIL_PASSWORD`: Your Google App Password.
    - `WEB_THREADS`: (Optional) Number of Waitress threads.

---

## ⚡ alternative: Vercel (Serverless)

Vercel is great for the UI, but limited for background tasks (Serverless functions have short timeouts).

### 🛠 Setup Steps
1.  **Install Vercel CLI**: `npm i -g vercel`
2.  **Deploy**: Run `vercel` in the project root.
3.  **Vercel Config**: The project includes `vercel.json` to handle Flask routing.

---

## 📦 Data & Persistence
- **SQLite**: The project uses `tracking.db`. On ephemeral platforms like Vercel or standard Render instances, this file will reset on every deploy.
- **HolySheet**: Bounces and unsubscribes are persisted to **Google Sheets via HolySheet**, ensuring you never lose your exclusion list even if the server restarts.

## 🔒 Security Checklist
1. Ensure `debug=False` in your entry point.
2. Use **Environment Variables** for all secrets (App Passwords, API Keys).
3. Enable **HTTPS** (handled automatically by Render and Vercel).
