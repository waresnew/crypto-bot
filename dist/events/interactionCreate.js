import { Events } from "discord.js";
import { db } from "../database.js";
export default {
    name: Events.InteractionCreate,
    async execute (interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            try {
                await db.run("update global_stats set commands_run_ever = commands_run_ever+1");
                command.execute(interaction);
            } catch (error) {
                console.error(`Error executing /${interaction.commandName}`);
                console.error(error);
            }
        } else if (interaction.isAutocomplete()) {
            const command1 = interaction.client.commands.get(interaction.commandName);
            if (!command1) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            try {
                await command1.autocomplete(interaction);
            } catch (err) {
                console.error(err);
            }
        } else if (interaction.isButton()) {} else if (interaction.isStringSelectMenu()) {} else if (interaction.isModalSubmit()) {}
    }
};

//# sourceMappingURL=interactionCreate.js.map