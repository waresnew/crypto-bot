import io
import json
import time
from datetime import datetime

import matplotlib
import mplfinance as mpf
import pandas as pd

matplotlib.use('Agg')


def make_chart(data):
    start1 = round(time.time() * 1000)
    body = json.loads(data)
    candles = body['candles']
    for candle in candles:
        for i in range(len(candle)):
            if type(candle[i]) is str:
                candle[i] = float(candle[i])
    df = pd.DataFrame(candles, columns=['date', 'open', 'high', 'low', 'close', 'volume'])
    df['date'] = pd.to_datetime(df['date'], unit='ms')
    df.set_index('date', inplace=True, verify_integrity=True)
    colours = mpf.make_marketcolors(inherit=True, up='#26a69a', down='#ef5350')
    style = mpf.make_mpf_style(base_mpf_style='binance', marketcolors=colours, figcolor='#151924', facecolor='#151924',
                               edgecolor='#1b1f2a', gridcolor='#1b1f2a',
                               rc={'axes.labelcolor': '#a0a4ad', 'xtick.color': '#a0a4ad', 'ytick.color': '#a0a4ad'})
    buffer = io.BytesIO()
    fig, axlist = mpf.plot(df, type='candle', style=style, volume=True, returnfig=True, xlabel='', ylabel='',
                           ylabel_lower='', tight_layout=True, volume_exponent=0)
    axlist[2].set_yticks([])
    axlist[0].spines.bottom.set_visible(False)
    axlist[2].spines.top.set_visible(False)
    start2 = round(time.time() * 1000)
    mpf.show()
    matplotlib.pyplot.close()
    print("Rendered chart @ ", datetime.now().isoformat(), ":\n    Plotted in ", start2 - start1,
          " ms\n    Rendered to png in ", round(time.time() * 1000) - start2, " ms", flush=True)
    return buffer.getvalue()


if __name__ == '__main__':
    make_chart(json.dumps({
        'meta': {
            'symbol': 'BTC',
            'cmc_id': 1,
            'name': 'Bitcoin'
        },
        'candles': [
            [1610000000000, '1', '3', '1', '2', '100'],
            [1610086400000, '2', '9', '2', '9', '500'],
            [1610172800000, '9', '9', '1', '1', '300'],
            [1610259200000, '1', '5', '1', '5', '200'],
        ]
    }))
