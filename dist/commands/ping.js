"use strict";
const tslib_1 = require("tslib");
const discord_js_1 = require("discord.js");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("ping")
        .setDescription("Gets your latency to the bot"),
    execute(interaction) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(0x627eea)
                .setTitle("Pong!")
                .setFields({ name: "Websocket Heartbeat 💓", value: `${interaction.client.ws.ping} ms`, inline: true }, { name: "API Latency ⌛", value: "Pinging..." });
            const first = yield interaction.editReply({ embeds: [embed] });
            const newEmbed = discord_js_1.EmbedBuilder.from(first.embeds[0]).setFields({ name: "Websocket Heartbeat 💓", value: `${interaction.client.ws.ping} ms`, inline: true }, { name: "API Latency ⌛", value: `${first.createdTimestamp - interaction.createdTimestamp} ms` });
            interaction.editReply({ embeds: [newEmbed] });
        });
    }
};
//# sourceMappingURL=ping.js.map