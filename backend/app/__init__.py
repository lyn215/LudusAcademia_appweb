from __future__ import annotations

from flask import Flask
from dotenv import load_dotenv

from .config import Config
from .routes import api_bp


def create_app() -> Flask:
    load_dotenv()
    app = Flask(__name__)
    app.config.from_object(Config)
    app.register_blueprint(api_bp)
    return app
