from flask import Blueprint, send_from_directory

pwa_bp = Blueprint("pwa", __name__)

@pwa_bp.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json')

@pwa_bp.route('/service-worker.js')
def service_worker():
    return send_from_directory('static', 'service-worker.js')
