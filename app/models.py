from datetime import datetime
from flask_login import UserMixin
from .extensions import db

class User(UserMixin, db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(120), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)

class RegistroDestajo(db.Model):
    __tablename__ = "registros_destajo"
    id = db.Column(db.Integer, primary_key=True)
    empleado_documento = db.Column(db.String(50), nullable=False, index=True)
    empleado_nombre = db.Column(db.String(200), nullable=False)
    destajo_id = db.Column(db.Integer, nullable=False, index=True)
    cantidad = db.Column(db.Float, nullable=False)
    fecha = db.Column(db.Date, nullable=False, index=True)
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    actualizado_en = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    sincronizado = db.Column(db.Boolean, default=False)
    last_sync = db.Column(db.DateTime)

    usuario = db.relationship('User', backref='destajos')

class GHDestajo(db.Model):
    __tablename__ = "GH_Destajos"
    Id = db.Column(db.Integer, primary_key=True)
    Planta = db.Column(db.String(200))
    Concepto = db.Column(db.String(200))
    Valor = db.Column(db.Float)

class GHEmpleado(db.Model):
    __tablename__ = "GH_Empleados"
    numeroDocumento = db.Column(db.String(50), primary_key=True)
    tipoIdentificacion = db.Column(db.String(50))
    nombreCompleto = db.Column(db.String(200))
    apellidoCompleto = db.Column(db.String(200))
    cargo = db.Column(db.String(200))
    centroCosto = db.Column(db.String(200))
    estado = db.Column(db.String(50))
    nombreNomina = db.Column(db.String(200))
    compania = db.Column(db.String(200))
    agrupador4 = db.Column(db.String(200))