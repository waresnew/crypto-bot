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
        embed.description =
            `Welcome to Botchain, the Discord bot that keeps you informed about the price of your favorite cryptocurrencies! With Botchain, you can set up alerts for specific cryptocurrencies and get DM'ed when the price (or some other statistic) reaches a certain threshold. With this in mind, please ensure that you always share a server with the bot and have it unblocked, or else some alerts may silently fail.

To get started, simply run </track:${commandIds.get("track")}> to open a menu. From there, you can set up an alert for the cryptocurrency.

Botchain supports most cryptocurrencies listed on popular exchanges, including Bitcoin, Ethereum, Litecoin, and many more.

We hope you find Botchain helpful in your cryptocurrency trading journey. If you have any questions or feedback, feel free to join the support server at https://discord.gg/mpyPadCG3q. Happy trading!`;
        embed.image = {
            url: "https://i.imgur.com/Mh8mqVt.png"
        };
        http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                embeds: [embed]
            }
        });
    }
} as APIApplicationCommand;