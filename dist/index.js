import { Client, Collection, Partials, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "url";
import { initApiCrons } from "./api/cmcApi.js";
dotenv.config();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel
    ]
});
initApiCrons();
const eventsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "events");
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));
for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = (await import(pathToFileURL(filePath).toString())).default;
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    }
    else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}
client.commands = new Collection();
const commandsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "commands");
registerCommands(commandsPath);
client.login(process.env["BOT_TOKEN"]);
async function registerCommands(curDir) {
    const commandFiles = fs.readdirSync(curDir);
    for (const file of commandFiles) {
        const filePath = path.join(curDir, file);
        if (file.endsWith(".js")) {
            const command = (await import(pathToFileURL(filePath).toString())).default;
            client.commands.set(command.data.name, command);
        }
        else if (fs.lstatSync(filePath).isDirectory()) {
            registerCommands(filePath);
        }
    }
}
//# sourceMappingURL=index.js.map