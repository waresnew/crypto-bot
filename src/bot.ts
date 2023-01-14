/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "url";
import fs from "node:fs";
import {commandIds, commands, initClient, interactionProcessors} from "./utils.js";
import dotenv from "dotenv";
import {APIApplicationCommand} from "discord-api-types/payloads/v10/_interactions/applicationCommands.js";
import {discordRequest} from "./requests.js";

dotenv.config();

const request = await discordRequest(
    "https://discord.com/api/v10/users/@me"
);
initClient(JSON.parse(await request.text()));
const getCommands = await discordRequest(`https://discord.com/api/v10/applications/${process.env["APP_ID"]}/commands`);
if (getCommands.status == 200) {
    JSON.parse(await getCommands.text()).forEach((command: APIApplicationCommand) => commandIds.set(command.name, command.id));
} else {
    throw "failed to init: fetching commands from api failed";
}
const cwd = path.dirname(fileURLToPath(import.meta.url));
// eslint-disable-next-line @typescript-eslint/no-unused-vars
await importFromDir(path.join(cwd, "services"), (_module: any) => {
    return; //importing = running top level stuff
});
await importFromDir(path.join(cwd, "commands"), (module: any) => {
    const command = module.default;
    commands.set(command.name, command);
});
await importInteractionProcessors(path.join(cwd, "ui"));
await import("./server.js");
console.log("Ready!");

/**use type any for modules*/
async function importFromDir(curDir: string, modifier: (module: any) => void) {
    const files = fs.readdirSync(curDir);
    for (const file of files) {
        const filePath = path.join(curDir, file);
        if (file.endsWith(".js")) {
            modifier(await import(pathToFileURL(filePath).toString()));
        } else if (fs.lstatSync(filePath).isDirectory()) {
            await importFromDir(filePath, modifier);
        }
    }
}

async function importInteractionProcessors(curDir: string) {
    const files = fs.readdirSync(curDir);
    for (const file of files) {
        const filePath = path.join(curDir, file);
        const folderName = path.basename(path.resolve(curDir));
        if (file.endsWith(".js") && folderName != "ui" && file.startsWith("interactionProcessor")) {
            const {default: module} = await import(pathToFileURL(filePath).toString());
            interactionProcessors.set(folderName, module);
        } else if (fs.lstatSync(filePath).isDirectory()) {
            await importInteractionProcessors(filePath);
        }
    }
}

