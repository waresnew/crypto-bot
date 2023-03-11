import {APIApplicationCommand, ApplicationCommandType, InteractionResponseType} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {getEmbedTemplate} from "../ui/templates";
import {client, commandIds} from "../utils";

export default {
    name: "help",
    type: ApplicationCommandType.ChatInput,
    description: "Introduces you to the bot",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        const embed = getEmbedTemplate();
        embed.title = "Welcome to Botchain!";
        embed.description =
            `Welcome to Botchain, the Discord bot that keeps you informed about the price of your favorite cryptocurrencies! With Botchain, you can set up alerts for specific cryptocurrencies and get DM'ed when the price (or some other statistic) reaches a certain threshold. This is particularly useful for traders and investors who need to keep a close eye on the markets.

To get started, simply run </coin:${commandIds.get("coin")}> to open a menu. From there, you can set up an alert for the cryptocurrency. You can choose from a variety of different statistics to track. Currently, the statistics we support are: price, 24 hour volume percent change, the market cap dominance, and the 1 hour/24 hour/7 day price percent change. The user interface is mainly point-and-click to make it as easy to use as possible.
When an alert is triggered, you will be notified by DM and the alert will be deleted. With this in mind, please ensure that you always share a server with the bot and have it unblocked, or else some alerts may silently fail.

If you want to personalize your experience, head over to </settings:${commandIds.get("settings")}> to change your preferences.

Botchain supports a wide range of popular cryptocurrencies, including Bitcoin, Ethereum, Litecoin, and many more. Specifically, we support the top 200 cryptocurrencies by market cap, as listed on CoinMarketCap. If a coin falls off the top 200 and you have an alert for it, you will be DM'ed and the alert will be deleted.

We hope you find Botchain helpful in your cryptocurrency trading journey. If you have any questions or feedback, feel free to join the support server at https://discord.gg/mpyPadCG3q. Happy trading!`;
        embed.fields = [
            {
                name: "Privacy Notice",
                value: "Your Discord tag and ID will be stored in our database. This is necessary for the bot to function properly. This information will also be shared with [Segment](https://segment.com/) and [Amplitude](https://amplitude.com/) for analytics and marketing purposes. If you do not consent to this information being stored and shared with these parties, please stop using this bot immediately.",
                inline: true
            }
        ];
        embed.thumbnail = {
            url: `https://cdn.discordapp.com/avatars/${client.id}/${client.avatar}.png`
        };
        http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                embeds: [embed]
            }
        });
    }
} as APIApplicationCommand;