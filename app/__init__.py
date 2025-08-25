from flask import Flask
from .extensions import db, login_manager
from .models import User
from .routes import web_bp
from .api import api_bp
from .auth import auth_bp
from .pwa import pwa_bp
from config import Config
import socket
from .sync import crear_tablas_sqlite, sincronizar_tablas_sqlserver

def can_connect_sqlserver(host, port, timeout=3):
    """Verifica si el servidor SQL está accesible."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False

def create_app():
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config.from_object(Config)

    is_online = can_connect_sqlserver("10.50.3.12", 5000)

    # 🔹 elegir qué base usar
    if is_online:
        app.config["SQLALCHEMY_DATABASE_URI"] = Config.SQLALCHEMY_DATABASE_URI_SQLSERVER
        print("✅ Conectado a SQL Server remoto")
    else:
        app.config["SQLALCHEMY_DATABASE_URI"] = Config.SQLALCHEMY_DATABASE_URI_SQLITE
        print("⚠️ No hay conexión, usando SQLite local")

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

        # Crear tablas SQLite si no existen
        crear_tablas_sqlite()

        # Sincronizar con SQL Server solo si hay conexión
        if is_online:
            sincronizar_tablas_sqlserver()

    return app
