import { Command, REST, Routes } from "discord.js";
import fs from "node:fs";
import dotenv from "dotenv";
import path from "node:path";
dotenv.config();

const commands : Command[] = [];
const commandPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const command = require(path.join(commandPath, file));
	commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(process.env["BOT_TOKEN"] as string);

(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);
		await rest.put(Routes.applicationCommands(process.env["APP_ID"] as string), { body: [] })
			.then(() => {
				console.log("Successfully deleted all application commands.");
				rest.put(
					Routes.applicationCommands(process.env["APP_ID"] as string),
					{ body: commands },
				).then(() => {
					console.log("Successfully reloaded the application (/) commands.");
				});
			})
			.catch(console.error);
		
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();
