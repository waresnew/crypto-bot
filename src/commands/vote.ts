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
import {voteCount} from "../utils/discordUtils";

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
                    description:
                        "Voting doesn't give you access to anything special, but it does help the bot grow and reach more people. Thank you!"
                        + "\n\n**Current Votes this Month: " + voteCount + "**"
                }],
                components: [{
                    type: ComponentType.ActionRow,
                    components: [
                        {
                            type: ComponentType.Button,
                            label: "Click here to vote!",
                            style: ButtonStyle.Link,
                            url: "https://top.gg/bot/1058388231273590885/vote"
                        }
                    ]
                }]
            }
        } as APIInteractionResponse);
    }
} as APIApplicationCommand;