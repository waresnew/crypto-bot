export function scientificNotationToNumber(input: string): string {
    const tokens = input.split("e");
    if (tokens.length == 1) {
        return input;
    }
    if (Number(input) >= 1) {
        return input;
    }
    const left = tokens[0].indexOf(".");
    let ans = "0.";
    for (let i = 0; i < Math.abs(Number(tokens[1])) - left; i++) {
        ans += "0";
    }
    ans += tokens[0].replace(".", "");
    return ans;
}

export interface Indexable {
    [index: string]: any;
}