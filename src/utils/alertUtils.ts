/**
 * Evaluates an inequality expression safely
 * @param expr only numbers, <, >, are allowed (no equal signs)
 * @returns true if the expression is true, false otherwise
 */
export function evalInequality(expr: string) {
    const match = expr.match(/^([\d-.e]+)([<>])([\d-.e]+)$/);
    if (!match) {
        return false;
    }
    const a = parseFloat(match[1]);
    const b = parseFloat(match[3]);
    switch (match[2]) {
        case ">":
            return a > b;
        case "<":
            return a < b;
    }
    return false;
}