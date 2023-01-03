import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { db } from "../database.js";
export default {
    data: new SlashCommandBuilder()
        .setName("stats")
        .setDescription("List bot stats"),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x2374ff)
            .setTitle("Global Statistics")
            .addFields({
            name: "Server Count",
            value: interaction.client.guilds.cache.size.toString()
        }, {
            name: "Total Commands Ran",
            value: (await db.get("select commands_run_ever from global_stats")).commands_run_ever.toString()
        }, {
            name: "Uptime",
            value: `${Math.floor(interaction.client.uptime / 1000)} seconds`
        });
        interaction.editReply({ embeds: [embed] });
    }
};
//# sourceMappingURL=stats.js.map