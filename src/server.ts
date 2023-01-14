/* eslint-disable @typescript-eslint/no-explicit-any */
import fastify, {FastifyRequest} from "fastify";
import rawBody from "fastify-raw-body";
import {
    APIApplicationCommandAutocompleteInteraction,
    APIMessageComponentInteraction,
    APIModalSubmitInteraction,
    ComponentType,
    InteractionResponseType,
    InteractionType,
    MessageFlags
} from "discord-api-types/v10";
import {db} from "./database.js";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput.js";
import {commands, interactionProcessors} from "./utils.js";
import nacl from "tweetnacl";

const server = fastify({logger: true});
// server.setErrorHandler((error, request, reply)=>{
//     console.error(error);
//     reply.status(500).send("error");
// });

await server.register(rawBody, {
    runFirst: true
});

server.post("/crypto-bot/interactions", async (request, response) => {
    if (!validateSignature(request)) {
        response.status(401).send({error: "Bad request signature"});
        return;
    }
    const message = JSON.parse(JSON.stringify(request.body));
    if (!message.user && message.member) {
        message.user = message.member.user;
    }
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
            await command.autocomplete(message, response);
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
        const interaction = message as APIModalSubmitInteraction;
        const origin = interaction.data.custom_id.substring(0, interaction.data.custom_id.indexOf("_"));
        const processor = interactionProcessors.get(origin) as any;
        if (processor) {
            await processor.processModal(message, response);
        }
    } else {
        response.status(400).send({error: "Unknown Type"});
    }
});
server.get("/", async (request, response) => {
    response.send(request.rawBody);
});
server.post("/", async (request, response) => {
    response.send(request.rawBody);
});
server.listen({port: 3000}, async (error, address) => {
    if (error) {
        console.error(error);
    }
    console.log(`Server listening on ${address}`);
});

function validateSignature(request: FastifyRequest) {
    if (request.method == "POST") {
        if (!request.headers || !request.headers["x-signature-timestamp"] || !request.headers["x-signature-ed25519"]) {
            return false;
        }
        return nacl.sign.detached.verify(
            Buffer.concat([Buffer.from(request.headers["x-signature-timestamp"] as string), Buffer.from(request.rawBody)]),
            Buffer.from(request.headers["x-signature-ed25519"] as string, "hex"),
            Buffer.from(process.env["PUBLIC_KEY"], "hex")
        );
    }
    return false;
}