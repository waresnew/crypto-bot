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
        embed.description = `We hope you find Botchain helpful in your cryptocurrency trading journey. If you have any questions or feedback, feel free to join the support server at https://discord.gg/mpyPadCG3q. Happy trading!

Check out the commands below to get started:

- </coin:${commandIds.get("coin")}>: Check the current price of a cryptocurrency.

- </coinalert:${commandIds.get("coinalert")}>: Track a cryptocurrency and get notified when it reaches a certain price.

- </gas:${commandIds.get("gas")}>: Check the current Ethereum gas price.

- </gasalert:${commandIds.get("gasalert")}>: Get notified when the Ethereum gas price for a slow/normal/fast transaction falls below a certain level.


We also have some technical analysis tools that you can use to make better trading decisions. Check out the commands below:

- </indicators:${commandIds.get("indicators")}>: Estimates the future price movement of a coin with a variety of technical indicators.

- </patterns:${commandIds.get("patterns")}>: Shows the recent candlestick patterns of a coin.

- </pivots:${commandIds.get("pivots")}>: Calculates the support/resistance levels of a coin.`;
        embed.image = {
            url: "https://i.imgur.com/w33cucZ.png"
        };
        http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                embeds: [embed]
            }
        });
    }
} as APIApplicationCommand;
