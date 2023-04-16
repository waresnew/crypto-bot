from http.server import BaseHTTPRequestHandler, HTTPServer

from python.graphMaker import make_chart


class Server(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/plain")
        self.end_headers()
        self.wfile.write(b'ok')

    def do_POST(self):
        if self.path == '/shutdown':
            self.send_response(204)
            self.send_header("Content-type", "text/plain")
            self.end_headers()
            self.wfile.write(b'ok')
            print("Python server shutting down...", flush=True)
            self.server.shutdown()
            exit(0)
        if self.path == '/chart':
            self.send_response(200)
            self.send_header("Content-type", "image/png")
            self.end_headers()
            length = int(self.headers.get('Content-Length'))
            data = self.rfile.read(length)
            self.wfile.write(make_chart(data))
        if self.path == '/indicators':
            self.send_response(200)
            self.send_header("Content-type", "text/plain")
            self.end_headers()
            self.wfile.write(b'ok')
        else:
            self.send_response(404)


print("Python server started", flush=True)
server = HTTPServer(('127.0.0.1', 3001), Server)
server.serve_forever()
