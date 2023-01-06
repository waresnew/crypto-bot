import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getEmbedTemplate } from "../ui/templates.js";
export default {
    data: new SlashCommandBuilder().setName("ping").setDescription("Gets bot latency"),
    async execute (interaction) {
        const embed = getEmbedTemplate(interaction.client).setTitle("Pong!").setFields({
            name: "Websocket Heartbeat 💓",
            value: `${interaction.client.ws.ping} ms`,
            inline: true
        }, {
            name: "API Latency ⌛",
            value: "Pinging..."
        });
        const first = await interaction.reply({
            embeds: [
                embed
            ],
            fetchReply: true
        });
        const newEmbed = EmbedBuilder.from(first.embeds[0]).setFields({
            name: "Websocket Heartbeat 💓",
            value: `${interaction.client.ws.ping} ms`,
            inline: true
        }, {
            name: "API Latency ⌛",
            value: `${first.createdTimestamp - interaction.createdTimestamp} ms`
        });
        interaction.editReply({
            embeds: [
                newEmbed
            ]
        });
    }
};

//# sourceMappingURL=ping.js.map