import talib
from talib import get_function_groups

from python.config import candle_pattern_names


def find_patterns(ohlcv):
    available_patterns = get_function_groups()['Pattern Recognition']
    patterns = {}
    for pattern in available_patterns:
        f = getattr(talib, pattern)
        result = f(ohlcv['open'], ohlcv['high'], ohlcv['low'], ohlcv['close']).tolist()
        bearish_exclude = [False] * len(result)
        bullish_exclude = [False] * len(result)
        for i in range(len(result)):
            bearish_exclude[i] = result[i] > 0
            bullish_exclude[i] = result[i] < 0
        if pattern + "_Bull" not in candle_pattern_names or pattern + "_Bear" not in candle_pattern_names:
            continue
        bull = candle_pattern_names[pattern + "_Bull"]
        bear = candle_pattern_names[pattern + "_Bear"]
        bull_name, bull_reliability = bull[0], bull[1]
        bear_name, bear_reliability = bear[0], bear[1]
        bull_list = [0] * len(result)
        bear_list = [0] * len(result)
        for i in range(len(result)):
            if not bearish_exclude[i]:
                bear_list[i] = result[i]
            if not bullish_exclude[i]:
                bull_list[i] = result[i]

        patterns[pattern + "_Bull"] = {"name": bull_name, "result": bull_list, "reliability": bull_reliability}
        patterns[pattern + "_Bear"] = {"name": bear_name, "result": bear_list, "reliability": bear_reliability}
        for e in patterns[pattern + "_Bull"]["result"]:
            assert e >= 0
        for e in patterns[pattern + "_Bear"]["result"]:
            assert e <= 0
    return patterns
