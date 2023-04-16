import numpy as np
from talib import ROC, ULTOSC, ATR, CCI, WILLR, ADX, MACD, STOCHRSI, STOCH, RSI, SMA, EMA


def find_ma(ohlcv, output):
    periods = [5, 10, 20, 50, 100, 200]
    for period in periods:
        output['sma' + str(period)] = SMA(ohlcv['close'], timeperiod=period)[-1]
        output['ema' + str(period)] = EMA(ohlcv['close'], timeperiod=period)[-1]


def find_indicators(ohlcv):
    indicators = {}
    find_ma(ohlcv, indicators)
    indicators['rsi'] = RSI(ohlcv['close'], timeperiod=14)[-1]  # RSI(14)
    indicators['stoch'] = STOCH(ohlcv['high'], ohlcv['low'], ohlcv['close'], fastk_period=14, slowk_period=6,
                                slowd_period=6)[1][-1]  # STOCH(14, 6, 6)
    indicators['stochrsi'] = STOCHRSI(ohlcv['close'], fastk_period=14, fastd_period=6)[1][-1]  # STOCHRSI(14, 6, 6)
    macd, macdsignal, macdhist = MACD(ohlcv['close'])
    indicators['macd'] = {}  # MACD(12, 26, 9)
    indicators['macd']['macd'] = macd[-1]
    indicators['macd']['macdsignal'] = macdsignal[-1]
    indicators['macd']['macdhist'] = macdhist[-1]

    indicators['adx'] = ADX(ohlcv['high'], ohlcv['low'], ohlcv['close'])[-1]  # ADX(14)
    indicators['willr'] = WILLR(ohlcv['high'], ohlcv['low'], ohlcv['close'])[-1]  # Williams' %R(14)
    indicators['cci'] = CCI(ohlcv['high'], ohlcv['low'], ohlcv['close'])[-1]  # CCI(14)
    indicators['atr'] = ATR(ohlcv['high'], ohlcv['low'], ohlcv['close'])[-1]  # ATR(14)
    indicators['ultosc'] = ULTOSC(ohlcv['high'], ohlcv['low'], ohlcv['close'])[-1]  # ULTOSC(7, 14, 28)
    indicators['roc'] = ROC(ohlcv['close'], timeperiod=14)[-1]  # ROC(14)
    return indicators


if __name__ == '__main__':
    body = {
        'open': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] * 10,
        'high': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] * 10,
        'low': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] * 10,
        'close': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] * 10,
        'volume': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] * 10
    }
    # noinspection DuplicatedCode
    ok = {
        'open': np.array([float(num) for num in body['open']]),
        'high': np.array([float(num) for num in body['high']]),
        'low': np.array([float(num) for num in body['low']]),
        'close': np.array([float(num) for num in body['close']]),
        'volume': np.array([float(num) for num in body['volume']])
    }
    find_indicators(ok)
