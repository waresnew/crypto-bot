import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import {db} from "../database";

export = {
    data: new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Gets some general bot stats"),
    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder()
            .setColor(0x627eea)
            .setTitle("Global Statistics")
            .addFields(
                { name: "Server Count", value: interaction.client.guilds.cache.size.toString(), inline: true},
                {name: "Total Commands Ran", value: (await db.get("select commands_run_ever from global_stats")).commands_run_ever.toString(),inline:true}
            );
        interaction.editReply({ embeds: [embed]});
    }
}