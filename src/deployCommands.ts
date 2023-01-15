import fs from "node:fs";
import dotenv from "dotenv";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "url";
import {APIApplicationCommand} from "discord-api-types/v10";
import discordRequest from "./requests";

dotenv.config();

const commands: APIApplicationCommand[] = [];
const commandPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "commands");
const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = (await import(path.join(pathToFileURL(commandPath).toString(), file))).default;
    commands.push(command.data.toJSON());
}

const devCommands: APIApplicationCommand[] = [];
const devCommandPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "commands", "dev");
const devCommandFiles = fs.readdirSync(devCommandPath).filter(file => file.endsWith(".js"));
for (const file of devCommandFiles) {
    const command = (await import(path.join(pathToFileURL(devCommandPath).toString(), file))).default;
    devCommands.push(command.data.toJSON());
}
await registerCommands(devCommands, true);
await registerCommands(commands, false);
process.exit();

async function registerCommands(commands: APIApplicationCommand[], dev: boolean) {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);
        await discordRequest(dev ? `https://discord.com/api/v10/applications/${process.env["APP_ID"]}/guilds/${process.env["GUILD_ID"]}/commands` : `https://discord.com/api/v10/applications/${process.env["APP_ID"]}/commands`,
            {
                method: "put",
                body: "{[]}"
            }
        );
        console.log("Successfully deleted all application commands.");
        await discordRequest(dev ? `https://discord.com/api/v10/applications/${process.env["APP_ID"]}/guilds/${process.env["GUILD_ID"]}/commands` : `https://discord.com/api/v10/applications/${process.env["APP_ID"]}/commands`,
            {
                method: "put",
                body: JSON.stringify(commands)
            }
        );
        console.log("Successfully reloaded the application (/) commands.");
    } catch
        (error) {
        console.error(error);
    }
}
