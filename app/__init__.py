from flask import Flask
from .extensions import db, login_manager
from .models import User
from .routes import web_bp
from .api import api_bp
from .auth import auth_bp
from .pwa import pwa_bp
from config import Config

def create_app():
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config.from_object(Config)

    db.init_app(app)
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    app.register_blueprint(web_bp)
    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(pwa_bp)

    with app.app_context():
        db.create_all()

    return app
