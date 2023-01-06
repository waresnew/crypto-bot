import { SlashCommandBuilder } from "discord.js";
export default {
    data: new SlashCommandBuilder().setName("test").setDescription("Run test commands"),
    async execute(interaction) {
        await interaction.reply("crazy");
    }
};
//# sourceMappingURL=test.js.map