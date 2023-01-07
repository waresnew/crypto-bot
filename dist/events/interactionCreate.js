import { Events } from "discord.js";
import { db } from "../database.js";
import { interactionProcessors } from "../utils.js";
export default {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            await db.run("update global_stats set commands_run_ever = commands_run_ever+1");
            await command.execute(interaction);
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
        else if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
            const origin = interaction.customId.substring(0, interaction.customId.indexOf("_"));
            if (!interaction.customId.endsWith(interaction.user.id.toString())) {
                interaction.reply({ content: "You do not have permission to interact with this!", ephemeral: true });
                return;
            }
            if (interaction.isButton()) {
                await interactionProcessors.get(origin).processButton(interaction);
            }
            else if (interaction.isStringSelectMenu()) {
                await interactionProcessors.get(origin).processStringSelect(interaction);
            }
            else if (interaction.isModalSubmit()) {
                await interactionProcessors.get(origin).processModal(interaction);
            }
        }
    }
};
//# sourceMappingURL=interactionCreate.js.map