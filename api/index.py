import os
import sys

# Add the project root to the sys.path so we can import web_app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from web_app import app

# Vercel needs the flask app instance to be the 'app' variable
# and it expects it to be exported in a file like api/index.py if configured that way.
