import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { db } from "../database.js";
export default {
    data: new SlashCommandBuilder().setName("stats").setDescription("List bot stats"),
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
            value: formatTime(interaction.client.uptime)
        });
        interaction.reply({ embeds: [embed] });
    }
};
function formatTime(milliseconds) {
    const days = Math.floor(milliseconds / 86400000);
    const hours = Math.floor((milliseconds % 86400000) / 3600000);
    const minutes = Math.floor((milliseconds % 86400000 % 3600000) / 60000);
    const seconds = Math.floor((milliseconds % 86400000 % 3600000 % 60000) / 1000);
    return `${days} ${days != 1 ? "days" : "day"}, ${hours} ${hours != 1 ? "hours" : "hour"}, ${minutes} ${minutes != 1 ? "minutes" : "minute"}, ${seconds} ${seconds != 1 ? "seconds" : "second"}`;
}
//# sourceMappingURL=stats.js.map