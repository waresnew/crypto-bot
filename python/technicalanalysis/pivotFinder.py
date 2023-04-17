def find_pivots(ohlcv):
    pivots = {'Classic': {}, 'Fibonacci': {}, 'Woodie': {}, 'DeMark': {}, 'Camarilla': {}}
    pivots['Classic']['Pivot'] = (ohlcv['high'][-2] + ohlcv['low'][-2] + ohlcv['close'][-2]) / 3
    pivots['Classic']['R1'] = 2 * pivots['Classic']['Pivot'] - ohlcv['low'][-2]
    pivots['Classic']['S1'] = 2 * pivots['Classic']['Pivot'] - ohlcv['high'][-2]
    pivots['Classic']['R2'] = pivots['Classic']['Pivot'] + (pivots['Classic']['R1'] - pivots['Classic']['S1'])
    pivots['Classic']['S2'] = pivots['Classic']['Pivot'] - (pivots['Classic']['R1'] - pivots['Classic']['S1'])
    pivots['Classic']['R3'] = ohlcv['high'][-2] + 2 * (pivots['Classic']['Pivot'] - ohlcv['low'][-2])
    pivots['Classic']['S3'] = ohlcv['low'][-2] - 2 * (ohlcv['high'][-2] - pivots['Classic']['Pivot'])

    pivots['Fibonacci']['Pivot'] = (ohlcv['high'][-2] + ohlcv['low'][-2] + ohlcv['close'][-2]) / 3
    pivots['Fibonacci']['R1'] = pivots['Fibonacci']['Pivot'] + ((ohlcv['high'][-2] - ohlcv['low'][-2]) * 0.382)
    pivots['Fibonacci']['S1'] = pivots['Fibonacci']['Pivot'] - ((ohlcv['high'][-2] - ohlcv['low'][-2]) * 0.382)
    pivots['Fibonacci']['R2'] = pivots['Fibonacci']['Pivot'] + ((ohlcv['high'][-2] - ohlcv['low'][-2]) * 0.618)
    pivots['Fibonacci']['S2'] = pivots['Fibonacci']['Pivot'] - ((ohlcv['high'][-2] - ohlcv['low'][-2]) * 0.618)
    pivots['Fibonacci']['R3'] = pivots['Fibonacci']['Pivot'] + ((ohlcv['high'][-2] - ohlcv['low'][-2]) * 1)
    pivots['Fibonacci']['S3'] = pivots['Fibonacci']['Pivot'] - ((ohlcv['high'][-2] - ohlcv['low'][-2]) * 1)

    pivots['Woodie']['Pivot'] = (ohlcv['high'][-2] + ohlcv['low'][-2] + 2 * ohlcv['close'][-2]) / 4
    pivots['Woodie']['R1'] = 2 * pivots['Woodie']['Pivot'] - ohlcv['low'][-2]
    pivots['Woodie']['S1'] = 2 * pivots['Woodie']['Pivot'] - ohlcv['high'][-2]
    pivots['Woodie']['R2'] = pivots['Woodie']['Pivot'] + (ohlcv['high'][-2] - ohlcv['low'][-2])
    pivots['Woodie']['S2'] = pivots['Woodie']['Pivot'] - (ohlcv['high'][-2] - ohlcv['low'][-2])
    pivots['Woodie']['R3'] = ohlcv['high'][-2] + 2 * (pivots['Woodie']['Pivot'] - ohlcv['low'][-2])
    pivots['Woodie']['S3'] = ohlcv['low'][-2] - 2 * (ohlcv['high'][-2] - pivots['Woodie']['Pivot'])

    pivots['Camarilla']['Pivot'] = (ohlcv['high'][-2] + ohlcv['low'][-2] + ohlcv['close'][-2]) / 3
    pivots['Camarilla']['R1'] = ohlcv['close'][-2] + ((ohlcv['high'][-2] - ohlcv['low'][-2]) * 1.1 / 12)
    pivots['Camarilla']['S1'] = ohlcv['close'][-2] - ((ohlcv['high'][-2] - ohlcv['low'][-2]) * 1.1 / 12)
    pivots['Camarilla']['R2'] = ohlcv['close'][-2] + ((ohlcv['high'][-2] - ohlcv['low'][-2]) * 1.1 / 6)
    pivots['Camarilla']['S2'] = ohlcv['close'][-2] - ((ohlcv['high'][-2] - ohlcv['low'][-2]) * 1.1 / 6)
    pivots['Camarilla']['R3'] = ohlcv['close'][-2] + ((ohlcv['high'][-2] - ohlcv['low'][-2]) * 1.1 / 4)
    pivots['Camarilla']['S3'] = ohlcv['close'][-2] - ((ohlcv['high'][-2] - ohlcv['low'][-2]) * 1.1 / 4)

    demark_x = ohlcv['high'][-2] + 2 * ohlcv['low'][-2] + ohlcv['close'][-2] \
        if ohlcv['close'][-2] < ohlcv['open'][-2] \
        else 2 * ohlcv['high'][-2] + ohlcv['low'][-2] + ohlcv['close'][-2] \
        if ohlcv['close'][-2] > ohlcv['open'][-2] \
        else ohlcv['high'][-2] + ohlcv['low'][-2] + 2 * ohlcv['close'][-2]
    pivots['DeMark']['Pivot'] = demark_x / 4
    pivots['DeMark']['R1'] = demark_x / 2 - ohlcv['low'][-2]
    pivots['DeMark']['S1'] = demark_x / 2 - ohlcv['high'][-2]
    return pivots
