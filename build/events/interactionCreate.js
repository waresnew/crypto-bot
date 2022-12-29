"use strict";
const tslib_1 = require("tslib");
const discord_js_1 = require("discord.js");
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
            try {
                yield command.execute(interaction);
            }
            catch (error) {
                console.error(`Error executing ${interaction.commandName}`);
                console.error(error);
            }
        });
    }
};
//# sourceMappingURL=interactionCreate.js.map