from flask import Blueprint, render_template, redirect, url_for, flash, request
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, logout_user, login_required, current_user
from .extensions import db
from .models import User

auth_bp = Blueprint("auth", __name__, template_folder="templates")

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

@auth_bp.route("/register", methods=["GET","POST"])
@login_required
def register():
    if request.method == "POST":
        email = request.form.get("email","").strip().lower()
        name = request.form.get("name","").strip()
        password = request.form.get("password","")
        if User.query.filter_by(email=email).first():
            flash("Ese correo ya está registrado", "error")
        else:
            user = User(email=email, name=name, password_hash=generate_password_hash(password))
            db.session.add(user)
            db.session.commit()
            flash("Usuario creado", "success")
            return redirect(url_for("auth.login"))
    return render_template("auth_register.html")

@auth_bp.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("auth.login"))
