from http.server import BaseHTTPRequestHandler, HTTPServer

from src.mplfinance.graphMaker import make_chart


class Server(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.wfile.write(b'ok')

    def do_POST(self):
        if self.path == '/shutdown':
            self.send_response(204)
            self.server.shutdown()
            exit(0)
        if self.path == '/chart':
            self.send_response(200)
            length = int(self.headers.get('Content-Length'))
            data = self.rfile.read(length)
            self.wfile.write(make_chart(data))
        self.send_response(404)


server = HTTPServer(('127.0.0.1', 3001), Server)
server.serve_forever()
