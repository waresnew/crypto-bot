import { EmbedBuilder,SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

export = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Gets your latency to the bot"),
    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder()
            .setColor(0x627eea)
            .setTitle("Pong!")
            .setFields({name:"Websocket Heartbeat 💓", value: `${interaction.client.ws.ping} ms`, inline:true},
            {name: "API Latency ⌛", value: "Pinging..."});
        const first = await interaction.editReply({embeds: [embed]});
        const newEmbed = EmbedBuilder.from(first.embeds[0]).setFields({name:"Websocket Heartbeat 💓", value: `${interaction.client.ws.ping} ms`, inline:true},
        {name: "API Latency ⌛", value: `${first.createdTimestamp-interaction.createdTimestamp} ms`});
        interaction.editReply({embeds: [newEmbed]});
    }
};