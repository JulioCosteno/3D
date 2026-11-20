#!/usr/bin/env python3
"""Servidor local para el Laboratorio de variables y dimensiones.

Uso:
    python servidor.py            -> http://localhost:8000
    python servidor.py 8080       -> otro puerto
    python servidor.py --https    -> https://<IP-del-equipo>:8443 (requiere cert.pem y key.pem)

Por qué no basta "python -m http.server": en algunos equipos Windows el registro asocia
.js con "text/plain" y el navegador rechaza los módulos ES. Este servidor fija los tipos MIME
correctos y desactiva la caché para ver los cambios al recargar.
"""
import http.server, socketserver, ssl, sys, os, socket, webbrowser, threading

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
        '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml',
        '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.wasm': 'application/wasm',
    }
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

def local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); ip = s.getsockname()[0]; s.close(); return ip
    except OSError:
        return '127.0.0.1'

def port_free(port):
    """True si el puerto NO está en uso (sin SO_REUSEADDR, que en Windows permite compartir puertos)."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            s.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        s.bind(('0.0.0.0', port))
        return True
    except OSError:
        return False
    finally:
        s.close()

class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = False   # evita "compartir" el puerto con otro servidor en Windows
    daemon_threads = True
    def server_bind(self):
        if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    use_https = '--https' in sys.argv
    open_browser = '--no-browser' not in sys.argv
    fixed = '--fixed' in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    port = int(args[0]) if args else (8443 if use_https else 8000)
    if not port_free(port):
        if fixed:
            sys.exit(f'El puerto {port} está ocupado por otro programa (¿un servidor anterior?). Ciérralo e intenta de nuevo.')
        start = port
        while not port_free(port) and port < start + 50:
            port += 1
        print(f'AVISO: el puerto {start} está ocupado (probablemente por tu servidor anterior). Uso el {port}.')
    with Server(('0.0.0.0', port), Handler) as httpd:
        scheme = 'http'
        if use_https:
            if not (os.path.exists('cert.pem') and os.path.exists('key.pem')):
                sys.exit('Faltan cert.pem y key.pem. Consulta README.md, sección "HTTPS en la red local".')
            ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            ctx.load_cert_chain('cert.pem', 'key.pem')
            httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)
            scheme = 'https'
        url = f'{scheme}://localhost:{port}/'
        print('=' * 60)
        print('  Laboratorio de variables y dimensiones  v2.0')
        print(f'  Abre:  {url}')
        print(f'  Red local: {scheme}://{local_ip()}:{port}/')
        print('  Deja esta ventana abierta. Ctrl+C para detener.')
        print('=' * 60)
        if open_browser:
            threading.Timer(1.0, lambda: webbrowser.open(url + '?v=2')).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nDetenido.')
