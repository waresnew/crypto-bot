import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { db } from "../../database";

export = {
    data: new SlashCommandBuilder()
        .setName("sql")
        .setDescription("Evaluates SQL queries using the main database")
        .addStringOption(option => option.setName("command").setDescription("The SQL command").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
        const command = interaction.options.getString("command");
        const embed = new EmbedBuilder()
            .setColor(0x627eea)
            .setTitle("Result");
        try {
            let output = "";
            await db.each(command, (err: unknown, row: unknown) => {
                if (err) {
                    throw err;
                }
               output += JSON.stringify(row)+"\n";
            });
            embed.setDescription(output);
        } catch (err) {
            embed.setDescription(err.toString());
        }
        interaction.editReply({ embeds: [embed]});
    }
};