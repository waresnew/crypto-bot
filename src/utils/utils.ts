import {UserError} from "../structs/userError";
import BigNumber from "bignumber.js";

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
    if (new BigNumber(when).abs().gt(1e16)) {
        throw new UserError("Error: The threshold you specified was too high. Please ensure it is between -1e16 and 1e16.");
    }
}

export interface Indexable {
    [index: string]: any;
}