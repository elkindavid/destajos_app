# app/lab_demo.py
from flask import Blueprint, render_template, jsonify, request, current_app
import os
import sqlite3
from datetime import datetime

lab_bp = Blueprint("lab", __name__)

# ---------------- Helpers ---------------------

def _get_db_path():
    """Usa la carpeta instance/ de Flask para guardar la DB local del laboratorio."""

    os.makedirs(current_app.instance_path, exist_ok=True)
    return os.path.join(current_app.instance_path, "lab_demo.db")

def _connect_db():
    path = _get_db_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row # permite dict-like rows
    return conn

def _init_schema():
    """Crea tabla si no existe."""
    conn = _connect_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS test_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

# ------------ Vistas HTML ---------------------

@lab_bp.route("/")
def lab_home():
    #Renderiza la página del laboratorio
    return render_template("lab/index.html")

# ------------------ API JSON para pruebas -------------------

@lab_bp.route("/api/ping")
def api_ping():
    """Ping simple para probar fetch() desde el navegador"""
    return jsonify({
        "status": "ok",
        "time": datetime.now().isoformat(timespec="seconds")
    })

@lab_bp.route("/api/echo", methods=["POST"])
def api_echo():
    """Recibe JSON o form-data y responde un saludo."""
    # Intentar leer JSON; si no, caer a form
    payload = request.get_json(silent=True) or request.form or {}
    name = (payload.get("name") or "").strip() or "Anon"
    return jsonify({
        "message": f"Hola {name}, recibido correctamente.",
        "received": payload
    })

@lab_bp.route("/api/sqlite/init", methods=["POST"])
def api_sqlite_init():
    """Crea la tabla (si no existe) e inserta un registro de prueba"""
    _init_schema()
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip() or "Inserción desde /Lab"
    now = datetime.now().isoformat(timespec="seconds")

    conn = _connect_db()
    cur = conn.cursor()
    cur.execute("INSERT INTO test_events (name, created_at) VALUES (?, ?)", (name, now))
    conn.commit()

    # contar filas para mostrar feedback
    cur.execute("SELECT COUNT(*) AS c FROM test_events")
    total = cur.fetchone()["c"]

    conn.close()
    return jsonify({"inserted": True, "rows_total": total, "last_name": name, "created_at": now})

@lab_bp.route("/api/sqlite/list")
def api_sqlite_list():
    """Lista registros guardados en la DB local del laboratorio."""
    _init_schema()
    conn = _connect_db()
    cur = conn.cursor()
    cur.execute("SELECT id, name, created_at FROM test_events ORDER BY id DESC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return jsonify({"rows": rows}) 
