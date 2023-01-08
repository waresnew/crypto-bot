import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {makeAlertsMenu, makeButtons, makeEmbed} from "../ui/alerts/interfaceCreator.js";

export default {
    data: new SlashCommandBuilder().setName("alerts").setDescription("Manage your alerts"),
    async execute(interaction: ChatInputCommandInteraction) {
        const instructions = await makeEmbed([], interaction);
        const actions = makeButtons(interaction);
        await interaction.reply({embeds: [instructions], components: [await makeAlertsMenu(interaction), actions]});
    }
};
