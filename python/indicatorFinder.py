import json

import numpy as np
import talib
from talib import *

from python.config import candle_pattern_names


def find_ma(ohlcv, output):
    periods = [5, 10, 20, 50, 100, 200]
    sma = {}
    ema = {}
    for period in periods:
        sma[str(period)] = SMA(ohlcv['close'], timeperiod=period)[-1]
        ema[str(period)] = EMA(ohlcv['close'], timeperiod=period)[-1]
    output['sma'] = sma
    output['ema'] = ema


def find_indicators(ohlcv):
    indicators = {}
    find_ma(ohlcv, indicators)
    indicators['rsi'] = RSI(ohlcv['close'], timeperiod=14)[-1]  # RSI(14)
    indicators['stoch'] = STOCH(ohlcv['high'], ohlcv['low'], ohlcv['close'], fastk_period=14, slowk_period=6,
                                slowd_period=6)[1][-1]  # STOCH(14, 6, 6)
    indicators['stochrsi'] = STOCHRSI(ohlcv['close'], fastk_period=14, fastd_period=6)[1][-1]  # STOCHRSI(14, 6, 6)
    indicators['macd'] = MACD(ohlcv['close'])[0][-1]  # MACD(12, 26, 9)
    indicators['adx'] = ADX(ohlcv['high'], ohlcv['low'], ohlcv['close'])[-1]  # ADX(14)
    indicators['willr'] = WILLR(ohlcv['high'], ohlcv['low'], ohlcv['close'])[-1]  # Williams' %R(14)
    indicators['cci'] = CCI(ohlcv['high'], ohlcv['low'], ohlcv['close'])[-1]  # CCI(14)
    indicators['atr'] = ATR(ohlcv['high'], ohlcv['low'], ohlcv['close'])[-1]  # ATR(14)
    indicators['bbands'] = {}
    upper_bband, middle_bband, lower_bband = BBANDS(ohlcv['close'], timeperiod=20)  # BBANDS(20, 2, 2)
    indicators['bbands']['upper'] = upper_bband[-1]
    indicators['bbands']['middle'] = middle_bband[-1]
    indicators['bbands']['lower'] = lower_bband[-1]
    indicators['ultosc'] = ULTOSC(ohlcv['high'], ohlcv['low'], ohlcv['close'])[-1]  # ULTOSC(7, 14, 28)
    indicators['roc'] = ROC(ohlcv['close'], timeperiod=14)[-1]  # ROC(14)
    return indicators


def find_candle_patterns(ohlcv):
    available_patterns = get_function_groups()['Pattern Recognition']
    patterns = {}
    for pattern in available_patterns:
        f = getattr(talib, pattern)
        result = f(ohlcv['open'], ohlcv['high'], ohlcv['low'], ohlcv['close'])
        obj = candle_pattern_names[pattern]
        if not type(obj) is tuple:
            continue
        name, reliability = obj
        patterns[name] = {"reliability": reliability, "result": result.tolist()}
    return patterns


# input should be in ascending chronological order
def build_output(data):
    body = json.loads(data)
    ohlcv = {
        'open': np.array([float(num) for num in body['open']]),
        'high': np.array([float(num) for num in body['high']]),
        'low': np.array([float(num) for num in body['low']]),
        'close': np.array([float(num) for num in body['close']]),
        'volume': np.array([float(num) for num in body['volume']])
    }
    output = {'patterns': find_candle_patterns(ohlcv), 'indicators': find_indicators(ohlcv)}
    return json.dumps(output)


if __name__ == '__main__':
    build_output(json.dumps({
        'open': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] * 10,
        'high': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] * 10,
        'low': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] * 10,
        'close': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] * 10,
        'volume': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] * 10
    }))
