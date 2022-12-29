"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const discord_js_1 = require("discord.js");
const dotenv_1 = tslib_1.__importDefault(require("dotenv"));
const node_fs_1 = tslib_1.__importDefault(require("node:fs"));
const node_path_1 = tslib_1.__importDefault(require("node:path"));
dotenv_1.default.config();
const client = new discord_js_1.Client({
    intents: [discord_js_1.GatewayIntentBits.Guilds]
});
console.log("Starting...");
const eventsPath = node_path_1.default.join(__dirname, "events");
const eventFiles = node_fs_1.default.readdirSync(eventsPath).filter(file => file.endsWith(".js"));
for (const file of eventFiles) {
    const filePath = node_path_1.default.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    }
    else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}
client.commands = new discord_js_1.Collection();
const commandsPath = node_path_1.default.join(__dirname, "commands");
const commandFiles = node_fs_1.default.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
    const filePath = node_path_1.default.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}
client.login(process.env["BOT_TOKEN"]);
//# sourceMappingURL=index.js.map