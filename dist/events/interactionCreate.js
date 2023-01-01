"use strict";
const tslib_1 = require("tslib");
const discord_js_1 = require("discord.js");
const database_1 = require("../database");
module.exports = {
    name: discord_js_1.Events.InteractionCreate,
    execute(interaction) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!interaction.isChatInputCommand()) {
                return;
            }
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            yield interaction.deferReply({ ephemeral: true });
            try {
                yield database_1.db.run("create table if not exists global_stats(id integer primary key, commands_run_ever integer default 0, unique_user integer default 0)");
                yield database_1.db.run("insert or ignore into global_stats(id) values(0)");
                yield database_1.db.run("update global_stats set commands_run_ever = commands_run_ever+1");
                command.execute(interaction);
            }
            catch (error) {
                console.error(`Error executing /${interaction.commandName}`);
                console.error(error);
            }
        });
    }
};
//# sourceMappingURL=interactionCreate.js.map