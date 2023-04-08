import base64
import io
import json

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
                               edgecolor='#1b1f2a', gridcolor='#a0a4ad',
                               rc={'axes.labelcolor': '#a0a4ad', 'xtick.color': '#a0a4ad', 'ytick.color': '#a0a4ad'})
    buffer = io.BytesIO()
    mpf.plot(df, type='candle', style=style, volume=True, returnfig=True, xlabel='', ylabel='', ylabel_lower='', tight_layout=True, savefig=buffer)
    return 'data:image/png;base64,'+base64.b64encode(buffer.getvalue()).decode('ascii')


if __name__ == '__main__':
    print(make_chart(json.dumps({
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
    })))
