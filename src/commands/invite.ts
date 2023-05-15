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
                    description: "[Click to add me to your server!](https://discord.com/api/oauth2/authorize?client_id=1058388231273590885&permissions=134144&scope=bot%20applications.commands)",
                    thumbnail: {
                        url: "https://i.imgur.com/w33cucZ.png"
                    }
                }]
            }
        } as APIInteractionResponse);
    }
} as APIApplicationCommand;