"use strict";
const tslib_1 = require("tslib");
const discord_js_1 = require("discord.js");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("stats")
        .setDescription("Gets some general bot stats"),
    execute(interaction) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(0x627eea)
                .setTitle("Global Statistics")
                .addFields({ name: "Server Count", value: interaction.client.guilds.cache.size.toString(), inline: true })
                .setTimestamp();
            interaction.reply({ embeds: [embed], ephemeral: true });
        });
    }
};
//# sourceMappingURL=stats.js.map