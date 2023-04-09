import io
import json
from http.server import BaseHTTPRequestHandler, HTTPServer

import mplfinance as mpf
import pandas as pd


def make_chart(data):
    body = json.loads(data)
    meta = body['meta']
    candles = body['candles']
    df = pd.DataFrame(candles, columns=['date', 'open', 'high', 'low', 'close', 'volume'])
    df['date'] = pd.to_datetime(df['date'], unit='ms')
    df.set_index('date', inplace=True, verify_integrity=True)
    colours = mpf.make_marketcolors(inherit=True, up='#26a69a', down='#ef5350', volume='#ffffff')
    style = mpf.make_mpf_style(base_mpf_style='binance', marketcolors=colours, figcolor='#151924', facecolor='#151924',
                               edgecolor='#1b1f2a', gridcolor='#1b1f2a',
                               rc={'axes.labelcolor': '#a0a4ad', 'xtick.color': '#a0a4ad', 'ytick.color': '#a0a4ad'})
    buffer = io.BytesIO()
    fig, axlist = mpf.plot(df, type='candle', style=style, volume=True, returnfig=True, xlabel='', ylabel='',
                           ylabel_lower='', tight_layout=True, volume_exponent=0)
    axlist[2].set_yticks([])
    axlist[0].spines.bottom.set_visible(False)
    axlist[2].spines.top.set_visible(False)
    fig.savefig(buffer)
    return buffer.getvalue()


if __name__ == '__main__':
    make_chart(json.dumps({
        'meta': {
            'symbol': 'BTC',
            'cmc_id': 1,
            'name': 'Bitcoin'
        },
        'candles': [
            [1610000000000, 1, 3, 1, 2, 100],
            [1610086400000, 2, 9, 2, 9, 500],
            [1610172800000, 9, 9, 1, 1, 300],
            [1610259200000, 1, 5, 1, 5, 200],
        ]
    }))


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
            self.server.shutdown()
            exit(0)
        if self.path == '/chart':
            self.send_response(200)
            self.send_header("Content-type", "image/png")
            self.end_headers()
            length = int(self.headers.get('Content-Length'))
            data = self.rfile.read(length)
            self.wfile.write(make_chart(data))
        else:
            self.send_response(404)


server = HTTPServer(('127.0.0.1', 3001), Server)
print("Python server started")
server.serve_forever()
