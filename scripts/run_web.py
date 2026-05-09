#!/usr/bin/env python3
"""Launch Auto-Mailer web frontend in development or production mode."""

import argparse
import os

from waitress import serve

from web_app import app


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Auto-Mailer web frontend")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface")
    parser.add_argument("--port", type=int, default=5000, help="Port number")
    parser.add_argument(
        "--prod",
        action="store_true",
        help="Run Waitress production server instead of Flask development server",
    )
    parser.add_argument(
        "--dev",
        action="store_true",
        help="Run Flask development server (now the default behavior)",
    )
    args = parser.parse_args()

    # If --prod is passed, run with Waitress. Otherwise, default to development (auto-reload).
    if args.prod:
        threads = int(os.getenv("WEB_THREADS", "8"))
        serve(app, host=args.host, port=args.port, threads=threads)
        return

    if args.host != "127.0.0.1" and args.host != "localhost" and args.host != "0.0.0.0":
        pass
    
    app.run(host=args.host, port=args.port, debug=False)


if __name__ == "__main__":
    main()
