#!/usr/bin/env python3
"""
Startup Script for Auto-Mailer
Runs both Web Server (port 5000) and API Server (port 5001) concurrently
"""

import os
import subprocess
import sys
import time
import signal
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

def run_servers():
    """Start both web and API servers."""
    
    print("=" * 70)
    print("🚀 Starting Auto-Mailer Dual-Server Architecture")
    print("=" * 70)
    
    # Default ports
    web_port = int(os.getenv("WEB_PORT", 5000))
    api_port = int(os.getenv("API_SERVER_PORT", 5001))
    
    print(f"\n📊 Web Server  will run on http://localhost:{web_port}")
    print(f"🔌 API Server will run on http://localhost:{api_port}")
    print("\nNote: Frontend will call API server at http://localhost:{api_port}")
    print("\n" + "=" * 70 + "\n")
    
    # Start web server
    web_process = subprocess.Popen(
        [sys.executable, "run_web.py"],
        cwd=BASE_DIR,
        env={**os.environ, "WEB_PORT": str(web_port)}
    )
    
    print(f"✓ Web Server started (PID: {web_process.pid})")
    
    # Give web server a moment to start
    time.sleep(2)
    
    # Start API server
    api_process = subprocess.Popen(
        [sys.executable, "api_server.py"],
        cwd=BASE_DIR,
        env={**os.environ, "API_SERVER_PORT": str(api_port)}
    )
    
    print(f"✓ API Server started (PID: {api_process.pid})")
    print("\n" + "=" * 70)
    print("✅ Both servers are running!")
    print("=" * 70 + "\n")
    
    def signal_handler(sig, frame):
        print("\n\n🛑 Shutting down servers...")
        web_process.terminate()
        api_process.terminate()
        
        # Wait for graceful shutdown
        try:
            web_process.wait(timeout=5)
            api_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            print("⚠️  Forcing shutdown...")
            web_process.kill()
            api_process.kill()
        
        print("✓ Servers stopped")
        sys.exit(0)
    
    # Handle Ctrl+C
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Keep both processes running
    try:
        while True:
            # Check if either process has died
            if web_process.poll() is not None:
                print("⚠️  Web server crashed!")
                api_process.terminate()
                sys.exit(1)
            if api_process.poll() is not None:
                print("⚠️  API server crashed!")
                web_process.terminate()
                sys.exit(1)
            time.sleep(1)
    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    run_servers()
