import { WebhookClient } from "discord.js";
//avoiding circular dependencies
export const cryptoSymbolList = [];
export const cryptoNameList = [];
/**key=command name */ export const interactionProcessors = new Map();
/** only accepts <1*/ export function scientificNotationToNumber(input) {
    const tokens = input.split("e");
    const left = tokens[0].indexOf(".");
    let ans = "0.";
    for(let i = 0; i < Math.abs(Number(tokens[1])) - left; i++){
        ans += "0";
    }
    ans += tokens[0].replace(".", "");
    return ans;
}
export async function alertDevs(message) {
    await new WebhookClient({
        url: process.env["LOG_WEBHOOK"]
    }).send(message);
}

//# sourceMappingURL=utils.js.map