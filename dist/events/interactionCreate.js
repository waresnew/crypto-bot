import { Events } from "discord.js";
import { db } from "../database.js";
export default {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            await interaction.deferReply();
            try {
                await db.run("update global_stats set commands_run_ever = commands_run_ever+1");
                command.execute(interaction);
            }
            catch (error) {
                console.error(`Error executing /${interaction.commandName}`);
                console.error(error);
            }
        }
        else if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            try {
                await command.autocomplete(interaction);
            }
            catch (err) {
                console.error(err);
            }
        }
    }
};
//# sourceMappingURL=interactionCreate.js.map