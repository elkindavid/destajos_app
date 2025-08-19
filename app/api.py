from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from sqlalchemy import text
from .extensions import db
from .models import RegistroDestajo
from datetime import datetime, date

api_bp = Blueprint("api", __name__)

@api_bp.get("/employees")
@login_required
def employees():
    q = request.args.get("q","")
    sql = text("""
        SELECT nombreCompleto, apellidoCompleto, numeroDocumento
        FROM GH_Empleados
        WHERE estado = 'ACTIVO' AND (
            nombreCompleto LIKE :q OR apellidoCompleto LIKE :q OR CAST(numeroDocumento AS NVARCHAR(50)) LIKE :q
        )
        ORDER BY nombreCompleto
    """)
    rows = db.session.execute(sql, {'q': f'%{q}%'}).mappings().all()
    return jsonify([{
        'nombre': f"{r['nombreCompleto']} {r['apellidoCompleto']}",
        'documento': str(r['numeroDocumento'])
    } for r in rows])

@api_bp.get("/destajos")
@login_required
def destajos_catalog():
    q = request.args.get("q","")
    sql = text("""
        SELECT Id, Planta, Concepto, Valor
        FROM GH_Destajos
        WHERE Concepto LIKE :q
        ORDER BY Concepto
    """)
    rows = db.session.execute(sql, {'q': f'%{q}%'}).mappings().all()
    return jsonify([{
        'id': int(r['Id']), 'planta': r['Planta'], 'concepto': r['Concepto'], 'valor': float(r['Valor'])
    } for r in rows])

@api_bp.post("/registros")
@login_required
def crear_registro():
    data = request.get_json(force=True)
    reg = RegistroDestajo(
        empleado_documento=data['empleado_documento'],
        empleado_nombre=data['empleado_nombre'],
        destajo_id=int(data['destajo_id']),
        cantidad=float(data['cantidad']),
        fecha=datetime.fromisoformat(data['fecha']).date(),
        usuario_id=current_user.id
    )
    db.session.add(reg)
    db.session.commit()
    return jsonify({'ok': True, 'id': reg.id})

@api_bp.put("/registros/<int:rid>")
@login_required
def editar_registro(rid):
    reg = db.session.get(RegistroDestajo, rid)
    if not reg: return jsonify({'error':'not found'}), 404
    data = request.get_json(force=True)
    for k in ['empleado_documento','empleado_nombre']:
        if k in data: setattr(reg,k,data[k])
    if 'destajo_id' in data: reg.destajo_id = int(data['destajo_id'])
    if 'cantidad' in data: reg.cantidad = float(data['cantidad'])
    if 'fecha' in data: reg.fecha = datetime.fromisoformat(data['fecha']).date()
    db.session.commit()
    return jsonify({'ok': True})

@api_bp.delete("/registros/<int:rid>")
@login_required
def eliminar_registro(rid):
    reg = db.session.get(RegistroDestajo, rid)
    if not reg: return jsonify({'error':'not found'}), 404
    db.session.delete(reg)
    db.session.commit()
    return jsonify({'ok': True})

@api_bp.get("/registros")
@login_required
def listar_registros():
    doc = request.args.get('documento')
    f1 = request.args.get('desde')
    f2 = request.args.get('hasta')

    sql = """
        SELECT r.id, r.empleado_documento, r.empleado_nombre, r.destajo_id, r.cantidad,
               r.fecha, r.fecha_registro, r.usuario_id, d.Concepto
        FROM registros_destajo r
        LEFT JOIN GH_Destajos d ON d.Id = r.destajo_id
        WHERE 1=1
    """
    params = {}
    if doc:
        sql += " AND r.empleado_documento = :doc"
        params['doc'] = doc
    if f1:
        sql += " AND r.fecha >= :f1"
        params['f1'] = date.fromisoformat(f1)
    if f2:
        sql += " AND r.fecha <= :f2"
        params['f2'] = date.fromisoformat(f2)
    sql += " ORDER BY r.fecha DESC, r.id DESC"
    rows = db.session.execute(text(sql), params).mappings().all()

    return jsonify([{
        'id': int(r['id']),
        'empleado_documento': r['empleado_documento'],
        'empleado_nombre': r['empleado_nombre'],
        'destajo_id': int(r['destajo_id']),
        'destajo': r['Concepto'],
        'cantidad': float(r['cantidad']),
        'fecha': r['fecha'].isoformat(),
        'fecha_registro': r['fecha_registro'].isoformat() if r['fecha_registro'] else None,
        'usuario_id': int(r['usuario_id'])
    } for r in rows])

@api_bp.post("/sync")
@login_required
def sync_batch():
    items = request.get_json(force=True)
    created = []
    for i in items:
        reg = RegistroDestajo(
            empleado_documento=i['empleado_documento'],
            empleado_nombre=i['empleado_nombre'],
            destajo_id = int(i['destajo_id']) if i.get('destajo_id') else -1,
            cantidad=float(i['cantidad']),
            fecha=datetime.fromisoformat(i['fecha']).date(),
            usuario_id=current_user.id
        )
        db.session.add(reg)
        db.session.flush()
        created.append(reg.id)
    db.session.commit()
    return jsonify({'ok': True, 'ids': created})
