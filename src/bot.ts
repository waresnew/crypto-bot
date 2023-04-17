/* istanbul ignore file */
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "url";
import fs from "node:fs";
import {APIApplicationCommand} from "discord-api-types/payloads/v10/_interactions/applicationCommands";
import didYouMean from "didyoumean";
import {binanceApiCron, cleanBinanceCacheCron} from "./services/binanceRest";
import {initBinanceWs} from "./services/binanceWs";
import {commandIds, commands, discordGot, initClient, interactionProcessors} from "./utils/discordUtils";
import {postServerCountCron} from "./services/topggRest";
import {spawn} from "node:child_process";
import {etherscanApiCron} from "./services/etherscanRest";
import {cronManager} from "./utils/utils";

didYouMean.threshold = null;
initClient(JSON.parse(await discordGot(
    "users/@me"
).text()));
const getCommands = await discordGot(`applications/${process.env["APP_ID"]}/commands`);
if (getCommands.ok) {
    JSON.parse(getCommands.body).forEach((command: APIApplicationCommand) => commandIds.set(command.name, command.id));
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
await import("./server");
const child = spawn("python3", ["python/pythonServer.py"]);
child.stdout.setEncoding("utf8");
child.stdout.on("data", data => {
    console.log(data.toString());
});
child.stderr.on("data", data => {
    console.error(data.toString());
});
binanceApiCron.start();
postServerCountCron.start();
initBinanceWs();
cleanBinanceCacheCron.start();
etherscanApiCron.start();
cronManager.start();
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

