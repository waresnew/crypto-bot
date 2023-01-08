import { SlashCommandBuilder } from "discord.js";
export default {
    data: new SlashCommandBuilder().setName("dev").setDescription("Run test commands"),
    async execute (interaction) {
        await interaction.reply("crazy");
    }
};

//# sourceMappingURL=dev.js.map