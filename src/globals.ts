import {InteractionProcessor} from "./ui/abstractInteractionProcessor.js";

//avoiding circular dependencies
export const cryptoSymbolList: string[] = [];
export const cryptoNameList: string[] = [];
export const whatOptions = ["price", "1h%", "24h%", "7d%", "volume%", "dominance"];
/**key=command name */
export const interactionProcessors = new Map<string, InteractionProcessor>();