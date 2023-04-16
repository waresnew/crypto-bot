import talib
from talib import get_function_groups

from python.config import candle_pattern_names


def find_patterns(ohlcv):
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
