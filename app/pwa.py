from flask import Blueprint, send_from_directory, make_response

pwa_bp = Blueprint('pwa', __name__, static_folder='static')

@pwa_bp.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json')

@pwa_bp.route('/service-worker.js')
def service_worker():
    response = make_response(send_from_directory('static', 'service-worker.js'))
    response.headers['Content-Type'] = 'application/javascript'
    return response