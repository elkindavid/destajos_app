from flask import Blueprint, render_template
from flask_login import login_required, current_user

web_bp = Blueprint("web", __name__, template_folder="templates")

@web_bp.route("/")
def home():
    return render_template("home.html")

@web_bp.route("/destajos")
@login_required
def destajos():
    return render_template("destajos.html", user=current_user)

@web_bp.route("/consultar")
@login_required
def consultar():
    return render_template("consultar.html")
