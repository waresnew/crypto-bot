import { Command, Client, Collection } from "discord.js";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "url";

dotenv.config();
const client = new Client({
  intents: []
});
const eventsPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "events"
);
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));
for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = (await import(pathToFileURL(filePath).toString())).default;
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}
client.commands = new Collection();
const commandsPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "commands"
);
registerCommands(commandsPath);
client.login(process.env["BOT_TOKEN"]);
async function registerCommands(curDir: string) {
  const commandFiles = fs.readdirSync(curDir);
  for (const file of commandFiles) {
    const filePath = path.join(curDir, file);
    if (file.endsWith(".js")) {
      const command: Command = (
        await import(pathToFileURL(filePath).toString())
      ).default;
      client.commands.set(command.data.name, command);
    } else if (fs.lstatSync(filePath).isDirectory()) {
      registerCommands(filePath);
    }
  }
}
