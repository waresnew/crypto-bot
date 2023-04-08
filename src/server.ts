/* istanbul ignore file */
import fastify, {FastifyRequest} from "fastify";
import rawBody from "fastify-raw-body";
import {
    APIApplicationCommandAutocompleteInteraction,
    APIInteraction,
    APIMessageComponentInteraction,
    APIModalSubmitInteraction,
    ComponentType,
    InteractionResponseType,
    InteractionType,
    MessageFlags
} from "discord-api-types/v10";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {commands, deepPatchCustomId, deepValidateCustomId, interactionProcessors} from "./utils";
import nacl from "tweetnacl";
import {analytics, initAnalytics} from "./analytics/segment";
import Sentry from "@sentry/node";
import {mongoClient, openDb} from "./database";
import {setRetry, ws} from "./services/binanceWs";
import got from "got";

await openDb();
initAnalytics();
const server = fastify({logger: true});
server.setErrorHandler((error, request, reply) => {
    console.log(error);
    Sentry.captureException(error);
    reply.status(500).send({error: "Internal server error"});
});
await server.register(rawBody, {
    runFirst: true
});

async function closeGracefully(signal: string | number) {
    console.log(`Received signal to terminate: ${signal}`);
    await server.close();
    await mongoClient.close();
    await analytics.flush();
    await got("127.0.0.1:3001/shutdown", {
        method: "POST"
    });
    setRetry(false);
    ws.close();
    console.log("All services closed, exiting...");
    process.kill(process.pid, signal);
}

process.once("SIGINT", closeGracefully);
process.once("SIGTERM", closeGracefully);
server.route({
    method: "POST",
    url: "/crypto-bot/interactions",
    preHandler: async (request, response) => {
        if (!validateSignature(request)) {
            await response.status(401).send({error: "Bad request signature"});
            return;
        }
        const message = request.body as APIInteraction;
        if (!message.user && message.member) {
            message.user = message.member.user;
        }
        if (message.type == InteractionType.MessageComponent || message.type == InteractionType.ModalSubmit) {
            if (!deepValidateCustomId(request.body)) {
                await response.send({
                    type: InteractionResponseType.ChannelMessageWithSource, data: {
                        content: "Error: A bot update has caused this embed to become invalid. Please regenerate it and try again.",
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }
        }
        if (message.type == InteractionType.MessageComponent) {
            const interaction: APIMessageComponentInteraction = message;
            if (interaction.message.embeds.length == 0) {
                await response.send({
                    type: InteractionResponseType.ChannelMessageWithSource, data: {
                        content: "Error: Expected an embed on this message, but none was found. Was the embed deleted?",
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }
        }
    },
    preSerialization: async (request, response, payload) => {
        const message = request.body as APIInteraction;
        if (!message.user && message.member) {
            message.user = message.member.user;
        }
        return deepPatchCustomId(payload);
    },
    handler: async (request, response) => {
        const message = request.body as APIInteraction;
        if (!message.user && message.member) {
            message.user = message.member.user;
        }
        if (message.user) {
            analytics.identify({
                userId: message.user.id,
                traits: {
                    username: message.user.username,
                    discriminator: message.user.discriminator
                }
            });
        }
        if (message.type == InteractionType.Ping) {
            response.send({
                type: InteractionResponseType.Pong
            });
        } else if (message.type == InteractionType.ApplicationCommand) {
            analytics.track({
                userId: message.user.id,
                event: "Ran command",
                properties: {
                    command: (message as APIChatInputApplicationCommandInteraction).data.name
                }
            });
            await commands.get((message as APIChatInputApplicationCommandInteraction).data.name).execute(message, response);
        } else if (message.type == InteractionType.ApplicationCommandAutocomplete) {
            const command = commands.get((message as APIApplicationCommandAutocompleteInteraction).data.name);
            if (command && typeof command.autocomplete == "function") {
                await command.autocomplete(message, response);
            }
        } else if (message.type == InteractionType.MessageComponent) {
            const interaction = message as APIMessageComponentInteraction;
            const origin = interaction.data.custom_id.substring(0, interaction.data.custom_id.indexOf("_"));

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
    }
});

server.get("/", async (request, response) => {
    response.send("ok");
});

server.listen({port: 3000, host: "0.0.0.0"}, async (error, address) => {
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