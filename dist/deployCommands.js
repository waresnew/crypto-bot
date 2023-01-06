import { REST, Routes } from "discord.js";
import fs from "node:fs";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "url";
dotenv.config();
const commands = [];
const commandPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "commands");
const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
    const command = (await import(path.join(pathToFileURL(commandPath).toString(), file))).default;
    commands.push(command.data.toJSON());
}
const devCommands = [];
const devCommandPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "commands", "dev");
const devCommandFiles = fs.readdirSync(devCommandPath).filter(file => file.endsWith(".js"));
for (const file of devCommandFiles) {
    const command = (await import(path.join(pathToFileURL(devCommandPath).toString(), file))).default;
    devCommands.push(command.data.toJSON());
}
registerCommands(devCommands, true);
registerCommands(commands, false);
async function registerCommands(commands, dev) {
    const rest = new REST({ version: "10" }).setToken(process.env["BOT_TOKEN"]);
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);
        await rest.put(dev
            ? Routes.applicationGuildCommands(process.env["APP_ID"], process.env["GUILD_ID"])
            : Routes.applicationCommands(process.env["APP_ID"]), { body: [] });
        console.log("Successfully deleted all application commands.");
        await rest.put(dev
            ? Routes.applicationGuildCommands(process.env["APP_ID"], process.env["GUILD_ID"])
            : Routes.applicationCommands(process.env["APP_ID"]), { body: commands });
        console.log("Successfully reloaded the application (/) commands.");
    }
    catch (error) {
        console.error(error);
    }
}
//# sourceMappingURL=deployCommands.js.map