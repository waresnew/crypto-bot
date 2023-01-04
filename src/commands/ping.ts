import { EmbedBuilder, SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

export default {
    data: new SlashCommandBuilder().setName("ping").setDescription("Gets bot latency"),
    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder()
            .setColor(0x2374ff)
            .setTitle("Pong!")
            .setFields(
                { name: "Websocket Heartbeat 💓", value: `${interaction.client.ws.ping} ms`, inline: true },
                { name: "API Latency ⌛", value: "Pinging..." }
            );
        const first = await interaction.reply({ embeds: [embed], fetchReply: true });
        const newEmbed = EmbedBuilder.from(first.embeds[0]).setFields(
            { name: "Websocket Heartbeat 💓", value: `${interaction.client.ws.ping} ms`, inline: true },
            { name: "API Latency ⌛", value: `${first.createdTimestamp - interaction.createdTimestamp} ms` }
        );
        interaction.editReply({ embeds: [newEmbed] });
    }
};
