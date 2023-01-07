import { SlashCommandBuilder } from "discord.js";
import { updateCmc } from "../../api/cmcApi.js";
export default {
    data: new SlashCommandBuilder().setName("updatecmc").setDescription("Updates crypto data manually"),
    async execute(interaction) {
        await updateCmc();
        await interaction.reply("done");
    }
};
//# sourceMappingURL=updateCmc.js.map