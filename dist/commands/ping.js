"use strict";
const tslib_1 = require("tslib");
const discord_js_1 = require("discord.js");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("ping")
        .setDescription("Gets your latency to the bot"),
    execute(interaction) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const sent = yield interaction.reply({ content: "Pinging...", fetchReply: true, ephemeral: true });
            interaction.editReply(`Pong! (${sent.createdTimestamp - interaction.createdTimestamp} ms)`);
        });
    }
};
//# sourceMappingURL=ping.js.map