import json
from http.server import BaseHTTPRequestHandler, HTTPServer

import numpy as np

from python.graph.graphMaker import make_chart
from python.technicalanalysis import exports


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
        elif self.path == '/indicators' or self.path == '/patterns' or self.path == '/pivots':
            self.send_response(200)
            self.send_header("Content-type", "text/plain")
            self.end_headers()
            body = json.loads(data)
            # input should be in ascending chronological order
            # noinspection DuplicatedCode
            ohlcv = {
                'open': np.array([float(num) for num in body['open']]),
                'high': np.array([float(num) for num in body['high']]),
                'low': np.array([float(num) for num in body['low']]),
                'close': np.array([float(num) for num in body['close']]),
                'volume': np.array([float(num) for num in body['volume']])
            }

            self.wfile.write(json.dumps(getattr(exports, 'find_' + self.path[1:])(ohlcv)).encode('utf-8'))
        else:
            self.send_response(404)


print("Python server started", flush=True)
server = HTTPServer(('127.0.0.1', 3001), Server)
server.serve_forever()
