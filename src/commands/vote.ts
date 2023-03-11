import {
    APIApplicationCommand,
    APIInteractionResponse,
    ApplicationCommandType,
    ButtonStyle,
    ComponentType,
    InteractionResponseType
} from "discord-api-types/v10";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {FastifyReply} from "fastify";
import {getEmbedTemplate} from "../ui/templates";

export default {
    name: "vote",
    type: ApplicationCommandType.ChatInput,
    description: "Support the bot!",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                embeds: [{
                    ...getEmbedTemplate(),
                    title: "Vote for Botchain",
                    description: "Thanks for supporting the bot! Click on one of the buttons below to vote!"
                }],
                components: [{
                    type: ComponentType.ActionRow,
                    components: [
                        {
                            type: ComponentType.Button,
                            label: "top.gg",
                            style: ButtonStyle.Link,
                            url: "https://top.gg/bot/1058388231273590885/vote"
                        },
                        {
                            type: ComponentType.Button,
                            label: "discordbotlist",
                            style: ButtonStyle.Link,
                            url: "https://discordbotlist.com/bots/botchain/upvote"
                        }
                    ]
                }]
            }
        } as APIInteractionResponse);
    }
} as APIApplicationCommand;