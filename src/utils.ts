import InteractionProcessor from "./ui/abstractInteractionProcessor.js";

//avoiding circular dependencies
export const cryptoSymbolList: string[] = [];
export const cryptoNameList: string[] = [];
export const whatOptions = new Map([ //end with % if you want % to be displayed
    ["price", "price"],
    ["1h%", "1 hour change"],
    ["24h%", "24 hour change"],
    ["7d%", "7 day change"],
    ["volume%", "24 hour volume change"],
    ["dominance%", "market cap dominance"]
]);
/**key=command name */
export const interactionProcessors = new Map<string, InteractionProcessor>();