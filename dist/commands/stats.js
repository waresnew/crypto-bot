"use strict";
const tslib_1 = require("tslib");
const discord_js_1 = require("discord.js");
const database_1 = require("../database");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("stats")
        .setDescription("Gets some general bot stats"),
    execute(interaction) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(0x627eea)
                .setTitle("Global Statistics")
                .addFields({ name: "Server Count", value: interaction.client.guilds.cache.size.toString(), inline: true }, { name: "Total Commands Ran", value: (yield database_1.db.get("select commands_run_ever from global_stats")).commands_run_ever.toString(), inline: true });
            interaction.editReply({ embeds: [embed] });
        });
    }
};
//# sourceMappingURL=stats.js.map