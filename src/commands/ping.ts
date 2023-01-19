import {getEmbedTemplate} from "../ui/templates";
import {APIApplicationCommand, ApplicationCommandType, InteractionResponseType} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import discordRequest from "../requests";

export default {
    name: "ping",
    type: ApplicationCommandType.ChatInput,
    description: "Gets bot latency",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        const embed = getEmbedTemplate();
        embed.title = "Pong!";
        embed.fields = [{
            name: "API Latency ⌛",
            value: "Pinging..."
        }];
        const start = (BigInt(interaction.id) >> 22n) + 1420070400000n;
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {embeds: [embed]}
        });
        const message = JSON.parse(await (await discordRequest(`https://discord.com/api/v10/webhooks/${process.env["APP_ID"]}/${interaction.token}/messages/@original`)).text());
        if (message) {
            const end = (BigInt(message.id) >> 22n) + 1420070400000n;
            embed.fields[0].value = `${end - start} ms`;
            await discordRequest(`https://discord.com/api/v10/webhooks/${process.env["APP_ID"]}/${interaction.token}/messages/@original`, {
                method: "patch",
                body: JSON.stringify({embeds: [embed]})
            });
        }
    }
} as APIApplicationCommand;
