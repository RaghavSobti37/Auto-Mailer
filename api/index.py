import os
import sys
import traceback

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from web_app import app
except Exception as e:
    from flask import Flask, jsonify
    app = Flask(__name__)
    @app.route("/(.*)")
    def catch_all(path):
        return jsonify({
            "error": "Startup Crash",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500
