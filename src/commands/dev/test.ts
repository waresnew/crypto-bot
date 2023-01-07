import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";

export default {
    data: new SlashCommandBuilder().setName("test").setDescription("Run test commands"),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply("crazy");
    }
};

