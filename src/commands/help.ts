import {APIApplicationCommand, ApplicationCommandType, InteractionResponseType} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {getEmbedTemplate} from "../ui/templates";
import {commandIds} from "../utils/discordUtils";

export default {
    name: "help",
    type: ApplicationCommandType.ChatInput,
    description: "Introduces you to the bot",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        const embed = getEmbedTemplate();
        embed.title = "Welcome to Botchain!";
        embed.description = "We hope you find Botchain helpful in your cryptocurrency trading journey. If you have any questions or feedback, feel free to join the support server at https://discord.gg/mpyPadCG3q. Happy trading!\n\nCheck out the commands below to get started:";
        embed.image = {
            url: "https://i.imgur.com/Mh8mqVt.png"
        };
        embed.fields = [
            {
                name: `</coin:${commandIds.get("coin")}>`,
                value: "Check the current price of a cryptocurrency."
            },
            {
                name: `</coinalert:${commandIds.get("coinalert")}>`,
                value: "Track a cryptocurrency and get notified when it reaches a certain price."
            },
            {
                name: `</gas:${commandIds.get("gas")}>`,
                value: "Check the current Ethereum gas price."
            }
        ];
        http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                embeds: [embed]
            }
        });
    }
} as APIApplicationCommand;