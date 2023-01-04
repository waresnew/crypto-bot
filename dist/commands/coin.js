import { chatInputApplicationCommandMention, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { db } from "../database.js";
import didyoumean from "didyoumean";
export const autocompleteList = [];
export default {
    data: new SlashCommandBuilder()
        .setName("coin")
        .setDescription("Gets information about a cryptocurrency")
        .addStringOption(option => option.setName("name").setDescription("The name/symbol of the coin").setAutocomplete(true)),
    async execute(interaction) {
        const input = interaction.options.getString("name");
        if (!input) {
            interaction.reply("Please specify a coin to lookup.");
            return;
        }
        const choices = [];
        let choice;
        await db.each("select * from cmc_cache", (err, row) => {
            if (err) {
                throw err;
            }
            const data = row;
            choices.push(data.name.toLowerCase());
            choices.push(data.symbol.toLowerCase());
            if (data.name.toLowerCase() == input.toLowerCase() || data.symbol.toLowerCase() == input.toLowerCase()) {
                choice = data;
            }
        });
        if (!choice) {
            const suggestion = didyoumean(input.toLowerCase(), choices);
            interaction.reply(`Couldn't find a coin called \`${input}\`. ${suggestion != null
                ? `Did you mean ${chatInputApplicationCommandMention(interaction.commandName, interaction.commandId)} \`${suggestion}\`?`
                : ""}`);
            return;
        }
        const quote = await db.get(`select * from quote_cache where reference=${choice.rowid}`);
        const embed = new EmbedBuilder()
            .setThumbnail(`https://s2.coinmarketcap.com/static/img/coins/128x128/${choice.id}.png`)
            .setColor(quote.percent_change_24h < 0 ? 0xed4245 : quote.percent_change_24h > 0 ? 0x3ba55c : 0xffffff)
            .setTitle(`${choice.name} (${choice.symbol}-USD)`)
            .setURL(`https://coinmarketcap.com/currencies/${choice.slug}`)
            .setAuthor({
            name: interaction.client.user.username,
            iconURL: interaction.client.user.displayAvatarURL()
        })
            .setFields({
            name: "Price",
            value: `$${quote.price < 1 ? quote.price.toPrecision(4) : Math.round(quote.price * 100) / 100}`
        });
        interaction.reply({ embeds: [embed] });
    },
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        let i = 0;
        const filtered = autocompleteList.filter(choice => {
            if (i < 25 && choice.startsWith(focusedValue)) {
                i++;
                return true;
            }
            return false;
        });
        await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
    }
};
//# sourceMappingURL=coin.js.map