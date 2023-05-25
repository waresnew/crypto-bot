/* istanbul ignore file */
import fastify, {FastifyRequest} from "fastify";
import rawBody from "fastify-raw-body";
import {
    APIApplicationCommandAutocompleteInteraction,
    APIInteraction,
    APIInteractionResponse,
    APIMessageComponentInteraction,
    APIModalSubmitInteraction,
    ComponentType,
    InteractionResponseType,
    InteractionType,
    MessageFlags,
    PermissionFlagsBits
} from "discord-api-types/v10";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import nacl from "tweetnacl";
import {analytics, initAnalytics} from "./utils/analytics";
import Sentry from "@sentry/node";
import {mongoClient, openDb, ServerSettings, UserDatas} from "./utils/database";
import {setRetry, ws} from "./services/binanceWs";
import {
    checkAlertCreatePerm,
    commandIds,
    commands,
    deepPatchCustomId,
    deepValidateCustomId,
    interactionProcessors,
    userNotVotedRecently
} from "./utils/discordUtils";
import got from "got";
import {UserError} from "./structs/userError";

await openDb(process.env["MONGO_URL"], `crypto-bot-${process.env["NODE_ENV"]}`);
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
    await got("http://127.0.0.1:3001/shutdown");
    setRetry(false);
    ws.close();
    console.log("All services closed, exiting...");
    process.kill(process.pid, signal);
}

process.once("SIGINT", closeGracefully);
process.once("SIGTERM", closeGracefully);

server.post("/crypto-bot/vote", async (request, response) => {
    if (request.headers["authorization"] != process.env["TOPGG_WEBHOOK_AUTH"]) {
        await response.status(401).send({error: "Bad authorization"});
        return;
    }
    await response.send("OK");
    if ((request.body as any).type == "upvote") {
        await UserDatas.updateOne({user: (request.body as any).user}, {
            $set: {
                user: (request.body as any).user,
                lastVoted: Date.now()
            }
        }, {upsert: true});
    }
});

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
        if (message.type == InteractionType.ApplicationCommand) {
            const interaction = message as APIChatInputApplicationCommandInteraction;
            const cmd = commands.get(interaction.data.name);
            if (cmd.voteRequired) {
                if (await userNotVotedRecently(message.user.id)) {
                    analytics.track({
                        userId: message.user.id,
                        event: "Ran votelocked command without voting"
                    });
                    await response.send({
                        type: InteractionResponseType.ChannelMessageWithSource, data: {
                            content: `You must vote for the bot on top.gg to use this command. </vote:${commandIds.get("vote")}>`,
                            flags: MessageFlags.Ephemeral
                        }
                    });
                    return;
                }
            }
            if (cmd.guildOnly) {
                if (interaction.guild_id === undefined) {
                    analytics.track({
                        userId: interaction.user.id,
                        event: "Attempted to use server cmd in DMs",
                        properties: {
                            command: cmd.name
                        }
                    });
                    await response.send({
                        type: InteractionResponseType.ChannelMessageWithSource,
                        data: {
                            content: "This command can only be used in a server."
                        }
                    } as APIInteractionResponse);
                    return;

                }
            }
            if (interaction.member && cmd.manageServerRequired) {
                if (!(BigInt(interaction.member.permissions) & PermissionFlagsBits.ManageGuild)) {
                    analytics.track({
                        userId: interaction.user.id,
                        event: "Attempted to use manage server cmd without perms",
                        properties: {
                            command: cmd.name
                        }
                    });
                    await response.send({
                        type: InteractionResponseType.ChannelMessageWithSource,
                        data: {
                            content: "You must have the Manage Server permission to use this command.",
                            flags: MessageFlags.Ephemeral
                        }
                    });
                }
            }
            if (interaction.member && cmd.name == "serveralerts") {
                try {
                    await checkAlertCreatePerm(interaction);
                } catch (e) {
                    if (e instanceof UserError) {
                        await response.send({
                            type: InteractionResponseType.ChannelMessageWithSource,
                            data: {
                                content: e.error,
                                flags: MessageFlags.Ephemeral
                            }
                        });
                        return;
                    } else {
                        throw e;
                    }
                }
            }
        }
        if (message.type == InteractionType.MessageComponent) {
            for (const cmd of commands.values()) {
                if (message.data.custom_id.split("_")[1] != cmd.name) {
                    continue;
                }
                if (cmd.voteRequired) {
                    if (await userNotVotedRecently(message.user.id)) {
                        analytics.track({
                            userId: message.user.id,
                            event: "Clicked votelocked component without voting"
                        });
                        await response.send({
                            type: InteractionResponseType.ChannelMessageWithSource, data: {
                                content: `You must vote for the bot on top.gg to do this. </vote:${commandIds.get("vote")}>`,
                                flags: MessageFlags.Ephemeral
                            }
                        });
                        return;
                    }
                }
                if (message.member && cmd.manageServerRequired) {
                    if (!(BigInt(message.member.permissions) & PermissionFlagsBits.ManageGuild)) {
                        analytics.track({
                            userId: message.user.id,
                            event: "Attempted to use manage server cmd without perms",
                            properties: {
                                command: cmd.name
                            }
                        });
                        await response.send({
                            type: InteractionResponseType.ChannelMessageWithSource,
                            data: {
                                content: "You must have the Manage Server permission to use this command.",
                                flags: MessageFlags.Ephemeral
                            }
                        });
                    }
                }
                if (message.member && cmd.name == "serveralerts") {
                    try {
                        await checkAlertCreatePerm(message);
                    } catch (e) {
                        if (e instanceof UserError) {
                            await response.send({
                                type: InteractionResponseType.ChannelMessageWithSource,
                                data: {
                                    content: e.error,
                                    flags: MessageFlags.Ephemeral
                                }
                            });
                            return;
                        } else {
                            throw e;
                        }
                    }

                }
            }
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
                    username: message.user.username
                }
            });
            if (!await UserDatas.findOne({user: message.user.id})) {
                await UserDatas.insertOne({
                    user: message.user.id,
                    lastVoted: 0
                });
            }
            if (message.guild_id) {
                if (!await ServerSettings.findOne({guild: message.guild_id})) {
                    await ServerSettings.insertOne({
                        guild: message.guild_id,
                        alertManagerRole: null
                    });
                }
                analytics.group({
                    userId: message.user.id,
                    groupId: message.guild_id
                });
            }
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

            } else if (interaction.data.component_type == ComponentType.StringSelect || interaction.data.component_type == ComponentType.RoleSelect || interaction.data.component_type == ComponentType.ChannelSelect) {
                const processor = interactionProcessors.get(origin) as any;
                if (processor) {
                    await processor.processSelect(interaction, response);
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