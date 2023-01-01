import { Events, ChatInputCommandInteraction } from "discord.js";
import { db } from "../database";

export = {
    name: Events.InteractionCreate,
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.isChatInputCommand()) {
            return;
        }
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }
        await interaction.deferReply({ ephemeral: true });
        try {
            await db.run("create table if not exists global_stats(id integer primary key, commands_run_ever integer default 0, unique_user integer default 0)");
            await db.run("insert or ignore into global_stats(id) values(0)");
            await db.run("update global_stats set commands_run_ever = commands_run_ever+1");
            command.execute(interaction);
        } catch (error) {
            console.error(`Error executing /${interaction.commandName}`);
            console.error(error);
        }
    }
};