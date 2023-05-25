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
                    description: (voteCount > 100 ?
                        "We're thrilled to announce that Botchain has already received over 100 votes this month, **making voting unnecessary for the remainder of the month.** Thank you all for your incredible support! You will not need to vote to access our exclusive commands for the rest of the month." :
                        "**🎉 Exciting Update: Reduced Voting Requirements for Botchain! 🎉**\nGreat news! Once Botchain surpasses 100 monthly votes, you will no longer need to vote on top.gg to access our exclusive commands. Additionally, each vote during the weekend will count as **2 votes** instead of 1! Spread the word and encourage your friends to vote, to benefit the entire Botchain community!\n\nGain access to our technical analysis suite by voting! Click the button below to vote.") + "\n\n**Current Votes this Month: " + voteCount + "**"
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