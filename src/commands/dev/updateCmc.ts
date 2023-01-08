import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {updateCmc} from "../../services/cmcApi.js";

export default {
    data: new SlashCommandBuilder().setName("updatecmc").setDescription("Updates crypto data manually"),
    async execute(interaction: ChatInputCommandInteraction) {
        await updateCmc();
        await interaction.reply("done");
    }
};

