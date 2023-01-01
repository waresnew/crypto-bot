import { Command, REST, Routes } from "discord.js";
import fs from "node:fs";
import dotenv from "dotenv";
import path from "node:path";
dotenv.config();

const commands: Command[] = [];
const commandPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const command = require(path.join(commandPath, file));
	commands.push(command.data.toJSON());
}

const devCommands: Command[] = [];
const devCommandPath = path.join(__dirname, "commands", "dev");
const devCommandFiles = fs.readdirSync(devCommandPath).filter(file => file.endsWith(".js"));
for (const file of devCommandFiles) {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const command = require(path.join(devCommandPath, file));
	devCommands.push(command.data.toJSON());
}
registerCommands(devCommands, true);
registerCommands(commands, false);

async function registerCommands(commands: Command[], dev: boolean) {
	const rest = new REST({ version: "10" }).setToken(process.env["BOT_TOKEN"] as string);
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);
		await rest.put(dev ? Routes.applicationGuildCommands(process.env["APP_ID"] as string, process.env["GUILD_ID"] as string) : Routes.applicationCommands(process.env["APP_ID"] as string), { body: [] });
		console.log("Successfully deleted all application commands.");
		await rest.put(
			dev ? Routes.applicationGuildCommands(process.env["APP_ID"] as string, process.env["GUILD_ID"] as string) : Routes.applicationCommands(process.env["APP_ID"] as string),
			{ body: commands },
		);
		console.log("Successfully reloaded the application (/) commands.");

	} catch (error) {
		console.error(error);
	}
}