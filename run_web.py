#!/usr/bin/env python3
"""Launch Auto-Mailer web frontend in development or production mode."""

import argparse
import os

from waitress import serve

from web_app import app


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Auto-Mailer web frontend")
    parser.add_argument("--host", default="0.0.0.0", help="Host interface")
    parser.add_argument("--port", type=int, default=5000, help="Port number")
    parser.add_argument(
        "--dev",
        action="store_true",
        help="Run Flask development server instead of Waitress",
    )
    args = parser.parse_args()

    if args.dev:
        app.run(host=args.host, port=args.port, debug=True)
        return

    # Waitress is the default to keep deployment behavior production-oriented.
    threads = int(os.getenv("WEB_THREADS", "8"))
    serve(app, host=args.host, port=args.port, threads=threads)


if __name__ == "__main__":
    main()
