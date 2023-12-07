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
                        "We're thrilled to announce that Botchain will no longer require votes to access any of our commands, **making voting unnecessary for the forseeable future.** Thank you all for your incredible support! Please still vote if you have time though, as it greatly helps with the bot's growth."
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