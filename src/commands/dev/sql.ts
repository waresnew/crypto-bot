import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {db} from "../../database.js";
import {getEmbedTemplate} from "../../ui/templates.js";

export default {
    data: new SlashCommandBuilder()
        .setName("sql")
        .setDescription("Evaluates SQL queries using the main database")
        .addStringOption(option => option.setName("command").setDescription("The SQL command").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
        const command = interaction.options.getString("command");
        const embed = getEmbedTemplate(interaction.client).setTitle("Result");
        try {
            let output = "";
            await db.each(command, (err, row) => {
                if (err) {
                    throw err;
                }
                output += JSON.stringify(row) + "\n";
            });
            embed.setDescription(output);
        } catch (err) {
            embed.setDescription(err.toString());
        }
        await interaction.reply({embeds: [embed]});
    }
};
