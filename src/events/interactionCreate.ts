import {Events, Interaction} from "discord.js";
import {db} from "../database.js";
import {interactionProcessors} from "../utils.js";

// noinspection JSUnusedGlobalSymbols
export default {
    name: Events.InteractionCreate,
    async execute(interaction: Interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            await db.run("update global_stats set commands_run_ever = commands_run_ever+1");
            await command.execute(interaction);

        } else if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            await command.autocomplete(interaction);
        } else if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
            const origin = interaction.customId.substring(0, interaction.customId.indexOf("_"));
            if (!interaction.customId.endsWith(interaction.user.id.toString())) {
                interaction.reply({content: "You do not have permission to interact with this!", ephemeral: true});
                return;
            }
            if (interaction.isButton()) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (interactionProcessors.get(origin) as any).processButton(interaction);
            } else if (interaction.isStringSelectMenu()) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (interactionProcessors.get(origin) as any).processStringSelect(interaction);
            } else if (interaction.isModalSubmit()) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (interactionProcessors.get(origin) as any).processModal(interaction);
            }
        }
    }
};