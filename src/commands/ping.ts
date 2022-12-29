import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

export = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Gets your latency to the bot"),
    async execute(interaction: ChatInputCommandInteraction) {
        const sent = await interaction.reply({ content: "Pinging...", fetchReply: true, ephemeral:true});
        interaction.editReply(`Pong! (${sent.createdTimestamp - interaction.createdTimestamp} ms)`);
    }
};