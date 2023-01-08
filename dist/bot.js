/* eslint-disable @typescript-eslint/no-explicit-any */ import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "url";
import { interactionProcessors } from "./utils.js";
import { initClient } from "./services/cmcApi.js";
dotenv.config();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel
    ],
    shards: "auto"
});
initClient(client);
const cwd = path.dirname(fileURLToPath(import.meta.url));
// eslint-disable-next-line @typescript-eslint/no-unused-vars
await importFromDir(path.join(cwd, "services"), (_module)=>{
    return; //importing = running top level stuff
});
await importFromDir(path.join(cwd, "events"), (module)=>{
    const event = module.default;
    if (event.once) {
        client.once(event.name, (...args)=>event.execute(...args));
    } else {
        client.on(event.name, (...args)=>event.execute(...args));
    }
});
client.commands = new Collection();
await importFromDir(path.join(cwd, "commands"), (module)=>{
    const command = module.default;
    client.commands.set(command.data.name, command);
});
await importInteractionProcessors(path.join(cwd, "ui"));
client.login(process.env["BOT_TOKEN"]);
/**use type any for modules*/ async function importFromDir(curDir, modifier) {
    const files = fs.readdirSync(curDir);
    for (const file of files){
        const filePath = path.join(curDir, file);
        if (file.endsWith(".js")) {
            modifier(await import(pathToFileURL(filePath).toString()));
        } else if (fs.lstatSync(filePath).isDirectory()) {
            await importFromDir(filePath, modifier);
        }
    }
}
async function importInteractionProcessors(curDir) {
    const files = fs.readdirSync(curDir);
    for (const file of files){
        const filePath = path.join(curDir, file);
        const folderName = path.basename(path.resolve(curDir));
        if (file.endsWith(".js") && folderName != "ui" && file.startsWith("interactionProcessor")) {
            const { default: module  } = await import(pathToFileURL(filePath).toString());
            interactionProcessors.set(folderName, module);
        } else if (fs.lstatSync(filePath).isDirectory()) {
            await importInteractionProcessors(filePath);
        }
    }
}

//# sourceMappingURL=bot.js.map