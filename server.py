"""
3D N-Body Orbital Mechanics & Antigravity Sandbox
Local Web Server & Application Launcher
"""

import sys
import os
import json
import socket
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT_START = 8080
MAX_PORT_TRIES = 10

class SandboxHTTPRequestHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        '': 'application/octet-stream',
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.wasm': 'application/wasm',
    }

    def end_headers(self):
        # Enable CORS and caching headers for smooth local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_GET(self):
        if self.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "online",
                "python_version": sys.version,
                "project": "3D Orbital Mechanics & Antigravity Sandbox"
            }).encode('utf-8'))
            return
        
        # Route default to index.html
        if self.path == '/':
            self.path = '/index.html'

        return super().do_GET()

    def do_POST(self):
        if self.path == '/api/run-reference':
            try:
                # Import reference sim module
                import reference_sim
                results = reference_sim.run_simulation()
                payload = {
                    "num_steps": results["num_steps"],
                    "dt": results["dt"],
                    "toggle_step": results["toggle_step"],
                    "bodies": [b["name"] for b in results["bodies"]],
                    "trajectory": results["history"].tolist()
                }
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(payload).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        self.send_error(404, "Endpoint not found")

    def log_message(self, format, *args):
        # Suppress noisy logs, keep it clean
        if "404" in format % args or "500" in format % args:
            super().log_message(format, *args)


def find_free_port(start_port):
    for port in range(start_port, start_port + MAX_PORT_TRIES):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', port))
                return port
            except OSError:
                continue
    return start_port


def main():
    # Ensure working directory is project root
    project_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_dir)

    port = find_free_port(PORT_START)
    server_address = ('127.0.0.1', port)
    httpd = HTTPServer(server_address, SandboxHTTPRequestHandler)

    url = f"http://localhost:{port}/index.html"
    print("==================================================================")
    print("  3D Orbital Simulation & Antigravity Sandbox")
    print("  Physical Mechanics & Vectorized Numerical Engine")
    print("==================================================================")
    print(f"  Server URL:    {url}")
    print(f"  Working Dir:   {project_dir}")
    print(f"  Python:        {sys.version.split()[0]}")
    print("==================================================================")
    print("  Press Ctrl+C to stop the server.")
    print("==================================================================")

    # Launch browser if not running with --no-browser
    if "--no-browser" not in sys.argv:
        try:
            webbrowser.open_new_tab(url)
        except Exception:
            pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()


if __name__ == "__main__":
    main()
