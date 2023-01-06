import { SlashCommandBuilder } from "discord.js";
export default {
    data: new SlashCommandBuilder().setName("test").setDescription("Run test commands"),
    async execute (interaction) {
        interaction.reply("crazy");
    }
};

//# sourceMappingURL=test.js.map