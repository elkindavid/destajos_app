import sqlite3
import pyodbc
from datetime import datetime
from config import Config
import os
from sqlalchemy import create_engine
import decimal

def crear_tablas_sqlite(db_filename="local.db"):
    os.makedirs("instance", exist_ok=True)
    db_path = os.path.join("instance", db_filename)
    conn_sqlite = sqlite3.connect(db_path)
    cursor_sqlite = conn_sqlite.cursor()

    cursor_sqlite.execute("""
    CREATE TABLE IF NOT EXISTS GH_Destajos (
        Id INTEGER PRIMARY KEY,
        Planta TEXT,
        Concepto TEXT,
        Valor REAL
    )
    """)

    cursor_sqlite.execute("""
    CREATE TABLE IF NOT EXISTS GH_Empleados (
        tipoIdentificacion TEXT,
        numeroDocumento TEXT PRIMARY KEY,
        nombreCompleto TEXT,
        apellidoCompleto TEXT,
        cargo TEXT,
        centroCosto TEXT,
        estado TEXT,
        nombreNomina TEXT,
        compania TEXT,
        agrupador4 TEXT
    )
    """)

    cursor_sqlite.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        email TEXT UNIQUE,
        name TEXT,
        password_hash TEXT,
        created_at TEXT
    )
    """)

    # Nueva tabla para trabajar offline y luego sincronizar
    cursor_sqlite.execute("""
    CREATE TABLE IF NOT EXISTS registros_destajo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empleado_documento TEXT NOT NULL,
        empleado_nombre TEXT NOT NULL,
        destajo_id INTEGER NOT NULL,
        cantidad REAL NOT NULL,
        fecha TEXT NOT NULL,
        fecha_registro TEXT NOT NULL,
        usuario_id INTEGER NOT NULL,
        actualizado_en TEXT,
        sincronizado INTEGER DEFAULT 0, -- 0 = pendiente, 1 = sincronizado
        last_sync TEXT
    )
    """)

    conn_sqlite.commit()
    conn_sqlite.close()


def _convert_value(value):
    """Convierte valores incompatibles con SQLite"""
    if isinstance(value, decimal.Decimal):
        return float(value)
    return value


def _normalize_datetime(value):
    """Convierte cualquier valor a string compatible con SQL Server (YYYY-MM-DD HH:MM:SS)"""
    if not value:
        return None
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    try:
        # Caso típico: viene como "2025-08-23 15:49:54.578919"
        return datetime.fromisoformat(value).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        try:
            # Caso: solo fecha "2025-08-23"
            return datetime.strptime(value, "%Y-%m-%d").strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            print("⚠️ No se pudo normalizar fecha:", value)
            return None


def sincronizar_tablas_sqlserver(db_filename="local.db"):
    os.makedirs("instance", exist_ok=True)
    db_path = os.path.join("instance", db_filename)
    conn_sqlite = sqlite3.connect(db_path)
    cursor_sqlite = conn_sqlite.cursor()

    try:
        engine = create_engine(Config.SQLALCHEMY_DATABASE_URI_SQLSERVER)
        conn_sql = engine.raw_connection()
        cursor_sql = conn_sql.cursor()
    except Exception as e:
        print("⚠️ No se pudo conectar a SQL Server:", e)
        return

    tablas = [
        ("GH_Destajos", ["Id"]),
        ("GH_Empleados", ["numeroDocumento"]),
        ("users", ["id"]),
    ]

    for tabla, claves in tablas:
        cursor_sql.execute(f"SELECT * FROM {tabla}")
        columnas = [c[0] for c in cursor_sql.description]
        datos_sql = cursor_sql.fetchall()
        registros_sql = [dict(zip(columnas, row)) for row in datos_sql]

        cursor_sqlite.execute(f"SELECT * FROM {tabla}")
        registros_sqlite = cursor_sqlite.fetchall()
        columnas_sqlite = [desc[0] for desc in cursor_sqlite.description]

        sqlite_dict = {tuple(row[columnas_sqlite.index(k)] for k in claves): row for row in registros_sqlite}

        # Insertar / actualizar
        for reg in registros_sql:
            clave = tuple(reg[k] for k in claves)
            if clave in sqlite_dict:
                sqlite_row = sqlite_dict[clave]
                actualizar = False
                for idx, col in enumerate(columnas_sqlite):
                    if col in reg and str(sqlite_row[idx]) != str(reg[col]):
                        actualizar = True
                        break
                if actualizar:
                    set_cols = ", ".join([f"{col} = ?" for col in columnas if col not in claves])
                    values = [_convert_value(reg[col]) for col in columnas if col not in claves]
                    values.append(clave[0])
                    cursor_sqlite.execute(
                        f"UPDATE {tabla} SET {set_cols} WHERE {claves[0]} = ?", values
                    )
            else:
                cols = ", ".join(columnas)
                placeholders = ", ".join("?" for _ in columnas)
                values = [_convert_value(reg[col]) for col in columnas]
                cursor_sqlite.execute(
                    f"INSERT INTO {tabla} ({cols}) VALUES ({placeholders})", values
                )

        # Eliminar registros que ya no existen en SQL Server
        claves_sql = [tuple(r[k] for k in claves) for r in registros_sql]
        for clave_sqlite, row in sqlite_dict.items():
            if clave_sqlite not in claves_sql:
                where_clause = " AND ".join([f"{k} = ?" for k in claves])
                cursor_sqlite.execute(f"DELETE FROM {tabla} WHERE {where_clause}", clave_sqlite)

    # 🔄 Ahora sincronizamos registros_destajo pendientes de SQLite → SQL Server
    cursor_sqlite.execute("SELECT * FROM registros_destajo WHERE sincronizado = 0")
    pendientes = cursor_sqlite.fetchall()
    columnas_reg = [desc[0] for desc in cursor_sqlite.description]
    pendientes_dict = [dict(zip(columnas_reg, row)) for row in pendientes]

    for registro in pendientes_dict:
        try:
            cursor_sql.execute("""
                INSERT INTO registros_destajo 
                (empleado_documento, empleado_nombre, destajo_id, cantidad, fecha, fecha_registro, usuario_id, actualizado_en, sincronizado, last_sync)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            """, (
                registro["empleado_documento"],
                registro["empleado_nombre"],
                int(registro["destajo_id"]),
                float(registro["cantidad"]),
                _normalize_datetime(registro["fecha"]),
                _normalize_datetime(registro["fecha_registro"]),
                int(registro["usuario_id"]),
                _normalize_datetime(registro["actualizado_en"]),
                _normalize_datetime(datetime.now())
            ))

            # ✅ Marcar como sincronizado en SQLite
            cursor_sqlite.execute(
                "UPDATE registros_destajo SET sincronizado = 1, last_sync = ? WHERE id = ?",
                (_normalize_datetime(datetime.now()), registro["id"])
            )

        except Exception as e:
            print(f"⚠️ Error sincronizando registro {registro['id']}: {e}")

    conn_sqlite.commit()
    conn_sqlite.close()
    conn_sql.commit()
    conn_sql.close()
