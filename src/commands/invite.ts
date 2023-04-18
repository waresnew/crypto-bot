import {
    APIApplicationCommand,
    APIInteractionResponse,
    ApplicationCommandType,
    InteractionResponseType
} from "discord-api-types/v10";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {FastifyReply} from "fastify";
import {getEmbedTemplate} from "../ui/templates";
import {client} from "../utils/discordUtils";

export default {
    name: "invite",
    type: ApplicationCommandType.ChatInput,
    description: "Add the bot to your server!",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                embeds: [{
                    ...getEmbedTemplate(),
                    title: "Invite Botchain",
                    description: "[Click to add me to your server!](https://discord.com/oauth2/authorize?client_id=1058388231273590885&scope=bot+applications.commands)",
                    thumbnail: {
                        url: `https://cdn.discordapp.com/avatars/${client.id}/${client.avatar}.png`
                    }
                }]
            }
        } as APIInteractionResponse);
    }
} as APIApplicationCommand;