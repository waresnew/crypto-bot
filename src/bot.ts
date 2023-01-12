/* eslint-disable @typescript-eslint/no-explicit-any */
import fastify from "fastify";
import rawBody from "fastify-raw-body";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "url";
import fs from "node:fs";
import {commandIds, initClient, interactionProcessors} from "./utils.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nacl from "tweetnacl";
import {
    APIApplicationCommandAutocompleteInteraction,
    APIMessageComponentInteraction,
    ComponentType,
    InteractionResponseType,
    InteractionType,
    MessageFlags
} from "discord-api-types/v10.js";
import {APIApplicationCommand} from "discord-api-types/payloads/v10/_interactions/applicationCommands.js";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput.js";
import {db} from "./database.js";

dotenv.config();

const commands = new Map<string, any>();
const request = await fetch(
    "https://discord.com/api/v10/users/@me",
    {
        method: "get",
        headers: {
            "Authorization": "Bot " + process.env["BOT_TOKEN"],
            "User-Agent": "DiscordBot (http, 1.0)"
        }
    }
);
initClient(JSON.parse(await request.text()));
const getCommands = await fetch(`https://discord.com/api/v10/applications/${process.env["APP_ID"]}/commands`, {
    headers: {
        "Authorization": `Bot ${process.env["BOT_TOKEN"]}`,
        "User-Agent": "DiscordBot (http, 1.0)"
    }
});
JSON.parse(await getCommands.text()).forEach((command: APIApplicationCommand) => commandIds.set(command.name, command.id));

const server = fastify({
    logger: true
});

server.register(rawBody, {
    runFirst: true
});

server.addHook("preHandler", async (request, response) => {
    if (request.method == "POST") {
        const isValidRequest = nacl.sign.detached.verify(
            Buffer.from(request.headers["X-Signature-Timestamp"] as string + request.rawBody), //todo could be body
            Buffer.from(request.headers["X-Signature-Ed25519"] as string, "hex"),
            Buffer.from(process.env["PUBLIC_KEY"], "hex")
        );
        if (!isValidRequest) {
            return response.status(401).send({error: "Bad request signature"});
        }
    }
    return response.status(404);
});

server.post("/crypto-bot/interactions", async (request, response) => {
    const message = JSON.parse(JSON.stringify(request.body));

    if (message.type == InteractionType.Ping) {
        response.send({
            type: InteractionResponseType.Pong
        });
    } else if (message.type == InteractionType.ApplicationCommand) {
        await db.run("update global_stats set commands_run_ever = commands_run_ever+1");
        await commands.get((message as APIChatInputApplicationCommandInteraction).data.name).execute(message, response);
    } else if (message.type == InteractionType.ApplicationCommandAutocomplete) {
        const command = commands.get((message as APIApplicationCommandAutocompleteInteraction).data.name);
        if (command && typeof command.autocomplete == "function") {
            await command.autocomplete(command, response);
        }
    } else if (message.type == InteractionType.MessageComponent) {
        const interaction = message as APIMessageComponentInteraction;
        const origin = interaction.data.custom_id.substring(0, interaction.data.custom_id.indexOf("_"));
        if (!interaction.data.custom_id.endsWith(interaction.user.id.toString())) {
            response.send({
                type: InteractionResponseType.ChannelMessageWithSource, data: {
                    content: "Error: You do not have permission to interact with this!",
                    flags: MessageFlags.Ephemeral
                }
            });
            return;
        }
        if (interaction.data.component_type == ComponentType.Button) {
            const processor = interactionProcessors.get(origin) as any;
            if (processor) {
                await processor.processButton(interaction, response);
            }

        } else if (interaction.data.component_type == ComponentType.StringSelect) {
            const processor = interactionProcessors.get(origin) as any;
            if (processor) {
                await processor.processStringSelect(interaction, response);
            }
        }
    } else if (message.type == InteractionType.ModalSubmit) {
        const processor = interactionProcessors.get(origin) as any;
        if (processor) {
            await processor.processModal(message, response);
        }
    } else {
        response.status(400).send({error: "Unknown Type"});
    }
});

server.listen(3000, async (error, address) => {
    if (error) {
        server.log.error(error);
    }
    server.log.info(`Server listening on ${address}`);
});

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