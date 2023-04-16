from http.server import BaseHTTPRequestHandler, HTTPServer

from graphMaker import make_chart
from indicatorFinder import build_output


class Server(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/shutdown':
            self.send_response(204)
            self.send_header("Content-type", "text/plain")
            self.end_headers()
            self.wfile.write(b'ok')
            print("Python server shutting down...", flush=True)
            self.server.shutdown()
            exit(0)
        else:
            self.send_response(200)
            self.send_header("Content-type", "text/plain")
            self.end_headers()
            self.wfile.write(b'ok')

    def do_POST(self):
        length = int(self.headers.get('Content-Length'))
        data = self.rfile.read(length)
        if self.path == '/chart':
            self.send_response(200)
            self.send_header("Content-type", "image/png")
            self.end_headers()
            self.wfile.write(make_chart(data))
        if self.path == '/indicators':
            self.send_response(200)
            self.send_header("Content-type", "text/plain")
            self.end_headers()
            self.wfile.write(build_output(data).encode('utf-8'))
        else:
            self.send_response(404)


print("Python server started", flush=True)
server = HTTPServer(('127.0.0.1', 3001), Server)
server.serve_forever()
