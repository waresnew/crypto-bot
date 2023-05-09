import {UserError} from "../structs/userError";
import BigNumber from "bignumber.js";

export function scientificNotationToNumber(input: string): string {
    const tokens = input.split("e");
    if (tokens.length == 1) {
        return input;
    }
    if (Number(input) < 1) {
        const left = Math.max(1, tokens[0].indexOf("."));
        let ans = "0.";
        for (let i = 0; i < Math.abs(Number(tokens[1])) - left; i++) {
            ans += "0";
        }
        ans += tokens[0].replace(".", "");
        return ans;
    } else if (Number(input) >= 1) {
        const point = Math.max(1, tokens[0].indexOf("."));
        const newPoint = point + Number(tokens[1]);
        let ans = tokens[0].replace(".", "");
        if (newPoint <= ans.length) {
            ans = ans.substring(0, newPoint) + (newPoint == ans.length ? "" : "." + ans.substring(newPoint));
        } else {
            ans += "0".repeat(newPoint - (ans.length - point) - 1);
        }
        return ans;
    }
    return input;
}

export function validateWhen(when: string) {
    if (!when) {
        throw new UserError("Error: You did not specify a threshold. Please try again.");
    }
    if (when.length > 18) {
        throw new UserError("Error: The threshold you specified was too long. Please note that your threshold must be at most 18 characters long.");
    }
    if (isNaN(Number(when)) || isNaN(parseFloat(when))) {
        throw new UserError("Error: The specified threshold was not a number.");
    }
    if (new BigNumber(when).abs().gt("1e16")) {
        throw new UserError("Error: The threshold you specified was too high. Please ensure it is between -1e16 and 1e16.");
    }
}

export interface Indexable {
    [index: string]: any;
}