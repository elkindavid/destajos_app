from functools import wraps
from flask import Blueprint, render_template, redirect, url_for, flash, request
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, logout_user, login_required, current_user
from .extensions import db
from .models import User

auth_bp = Blueprint("auth", __name__, template_folder="templates")

def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            flash("Debes iniciar sesión primero.", "error")
            return redirect(url_for("auth.login"))
        if not getattr(current_user, "is_admin", False):
            flash("No tienes permisos para acceder a esta sección", "error")
            return redirect(url_for("web.home"))
        return f(*args, **kwargs)
    return wrapper

# Listado de usuarios (solo admins)
@auth_bp.route("/usuarios")
@admin_required
def listado():
    users = User.query.order_by(User.id).all()
    return render_template("usuarios_listado.html", users=users)

# Login
@auth_bp.route("/login", methods=["GET","POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email","").strip().lower()
        password = request.form.get("password","")
        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password_hash, password):
            flash("Credenciales inválidas", "error")
            return redirect(url_for("auth.login"))
        login_user(user)
        return redirect(url_for("web.home"))
    return render_template("auth_login.html")

# Registro de usuarios (solo admins pueden crear usuarios)
@auth_bp.route("/register", methods=["GET","POST"])
@admin_required
def register():
    if request.method == "POST":
        email = request.form.get("email","").strip().lower()
        name = request.form.get("name","").strip()
        password = request.form.get("password","")
        # checkbox opcional para crear admin desde el formulario (solo admin puede usarlo)
        is_admin_flag = True if request.form.get("is_admin") == "on" else False

        if User.query.filter_by(email=email).first():
            flash("Ese correo ya está registrado", "error")
        else:
            user = User(
                email=email,
                name=name,
                password_hash=generate_password_hash(password),
                is_admin=is_admin_flag
            )
            db.session.add(user)
            db.session.commit()
            flash("Usuario creado", "success")
            return redirect(url_for("auth.listado"))
    return render_template("auth_register.html")

# Cambiar contraseña (todos los usuarios autenticados)
@auth_bp.route("/change-password", methods=["GET", "POST"])
@login_required
def change_password():
    if request.method == "POST":
        current_password = request.form.get("current_password")
        new_password = request.form.get("new_password")
        confirm_password = request.form.get("confirm_password")

        # Validaciones
        if not check_password_hash(current_user.password_hash, current_password):
            flash("La contraseña actual es incorrecta", "error")
            return redirect(url_for("auth.change_password"))

        if new_password != confirm_password:
            flash("Las contraseñas nuevas no coinciden", "error")
            return redirect(url_for("auth.change_password"))

        # Guardar nueva contraseña
        current_user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        flash("Tu contraseña ha sido actualizada correctamente", "success")
        return redirect(url_for("web.home"))

    return render_template("auth_change_password.html")

# Logout
@auth_bp.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("auth.login"))
