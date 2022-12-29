import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";

export = {
    data: new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Gets some general bot stats"),
    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder()
            .setColor(0x627eea)
            .setTitle("Global Statistics")
            .addFields(
                { name: "Server Count", value: interaction.client.guilds.cache.size.toString(), inline: true }
            )
            .setTimestamp();
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
}