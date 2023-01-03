import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
export default {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Gets bot latency"),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x2374ff)
            .setTitle("Pong!")
            .setFields({ name: "Websocket Heartbeat 💓", value: `${interaction.client.ws.ping} ms`, inline: true }, { name: "API Latency ⌛", value: "Pinging..." });
        const first = await interaction.editReply({ embeds: [embed] });
        const newEmbed = EmbedBuilder.from(first.embeds[0]).setFields({ name: "Websocket Heartbeat 💓", value: `${interaction.client.ws.ping} ms`, inline: true }, { name: "API Latency ⌛", value: `${first.createdTimestamp - interaction.createdTimestamp} ms` });
        interaction.editReply({ embeds: [newEmbed] });
    }
};
//# sourceMappingURL=ping.js.map