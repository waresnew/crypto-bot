import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { db } from "../../database.js";
export default {
    data: new SlashCommandBuilder()
        .setName("sql")
        .setDescription("Evaluates SQL queries using the main database")
        .addStringOption(option => option.setName("command").setDescription("The SQL command").setRequired(true)),
    async execute(interaction) {
        const command = interaction.options.getString("command");
        const embed = new EmbedBuilder().setColor(0x2374ff).setTitle("Result");
        try {
            let output = "";
            await db.each(command, (err, row) => {
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
        interaction.reply({ embeds: [embed] });
    }
};
//# sourceMappingURL=sql.js.map