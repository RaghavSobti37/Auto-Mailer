"""
Vercel Static File Server
This serves the frontend files ONLY
All API calls go to Render backend at https://auto-mailer-5e54.onrender.com
"""
import os
from flask import Flask, render_template, send_from_directory
from pathlib import Path

app = Flask(__name__, template_folder="../templates", static_folder="../static")

BASE_DIR = Path(__file__).resolve().parent.parent

@app.route('/')
def index():
    """Serve main frontend page."""
    try:
        return render_template('web/index.html')
    except Exception as e:
        return f"Error loading template: {e}", 500

@app.route('/dashboard')
def dashboard():
    """Serve dashboard page."""
    try:
        return render_template('web/dashboard.html')
    except Exception as e:
        return f"Error loading template: {e}", 500

@app.route('/monitor/<cid>')
def monitor(cid):
    """Serve monitor page."""
    try:
        return render_template('web/monitor.html')
    except Exception as e:
        return f"Error loading template: {e}", 500

@app.route('/login')
def login():
    """Serve login page."""
    try:
        return render_template('web/login.html')
    except Exception as e:
        return f"Error loading template: {e}", 500

@app.route('/docs')
def docs():
    """Serve docs page."""
    return "Documentation - Coming Soon", 200

@app.route('/static/<path:path>')
def serve_static(path):
    """Serve static files (CSS, JS, images)."""
    return send_from_directory('../static', path)

@app.errorhandler(404)
def not_found(e):
    """Return index.html for unmatched routes (SPA routing)."""
    try:
        return render_template('web/index.html')
    except:
        return "Not Found", 404

if __name__ == "__main__":
    app.run()

