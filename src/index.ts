import { Command, Client, Collection } from "discord.js";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config();
const client = new Client({
    intents: []
});
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));
for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
registerCommands(commandsPath);
client.login(process.env["BOT_TOKEN"]);

function registerCommands(curDir: string) {
    const commandFiles = fs.readdirSync(curDir);
    for (const file of commandFiles) {
        const filePath = path.join(curDir, file);
        if (file.endsWith(".js")) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const command: Command = require(filePath);
            client.commands.set(command.data.name, command);
        } else if (fs.lstatSync(filePath).isDirectory()) {
            registerCommands(filePath);
        }
    }
}