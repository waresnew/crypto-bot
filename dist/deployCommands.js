"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const discord_js_1 = require("discord.js");
const node_fs_1 = tslib_1.__importDefault(require("node:fs"));
const dotenv_1 = tslib_1.__importDefault(require("dotenv"));
const node_path_1 = tslib_1.__importDefault(require("node:path"));
dotenv_1.default.config();
const commands = [];
const commandPath = node_path_1.default.join(__dirname, "commands");
const commandFiles = node_fs_1.default.readdirSync(commandPath).filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
    const command = require(node_path_1.default.join(commandPath, file));
    commands.push(command.data.toJSON());
}
const devCommands = [];
const devCommandPath = node_path_1.default.join(__dirname, "commands", "dev");
const devCommandFiles = node_fs_1.default.readdirSync(devCommandPath).filter(file => file.endsWith(".js"));
for (const file of devCommandFiles) {
    const command = require(node_path_1.default.join(devCommandPath, file));
    devCommands.push(command.data.toJSON());
}
registerCommands(devCommands, true);
registerCommands(commands, false);
function registerCommands(commands, dev) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const rest = new discord_js_1.REST({ version: "10" }).setToken(process.env["BOT_TOKEN"]);
        try {
            console.log(`Started refreshing ${commands.length} application (/) commands.`);
            yield rest.put(dev ? discord_js_1.Routes.applicationGuildCommands(process.env["APP_ID"], process.env["GUILD_ID"]) : discord_js_1.Routes.applicationCommands(process.env["APP_ID"]), { body: [] });
            console.log("Successfully deleted all application commands.");
            yield rest.put(dev ? discord_js_1.Routes.applicationGuildCommands(process.env["APP_ID"], process.env["GUILD_ID"]) : discord_js_1.Routes.applicationCommands(process.env["APP_ID"]), { body: commands });
            console.log("Successfully reloaded the application (/) commands.");
        }
        catch (error) {
            console.error(error);
        }
    });
}
//# sourceMappingURL=deployCommands.js.map