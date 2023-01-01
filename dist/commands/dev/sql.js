"use strict";
const tslib_1 = require("tslib");
const discord_js_1 = require("discord.js");
const database_1 = require("../../database");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("sql")
        .setDescription("Evaluates SQL queries using the main database")
        .addStringOption(option => option.setName("command").setDescription("The SQL command").setRequired(true)),
    execute(interaction) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const command = interaction.options.getString("command");
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(0x627eea)
                .setTitle("Result");
            try {
                let output = "";
                yield database_1.db.each(command, (err, row) => {
                    if (err) {
                        throw err;
                    }
                    output += JSON.stringify(row) + "\n";
                });
                embed.setDescription(output);
            }
            catch (err) {
                embed.setDescription(err.toString());
            }
            interaction.editReply({ embeds: [embed] });
        });
    }
};
//# sourceMappingURL=sql.js.map