import { chatInputApplicationCommandMention, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import moment from "moment";
import { db } from "../database.js";
import didyoumean from "didyoumean";
export const cryptoSymbolList = [];
export const cryptoNameList = [];
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
        const choice = await db.get("select * from cmc_cache where symbol=? collate nocase or name=? collate nocase", input);
        if (!choice) {
            const suggestion = didyoumean(input.toLowerCase(), cryptoSymbolList.concat(cryptoNameList));
            interaction.reply(`Couldn't find a coin called \`${input}\`. ${suggestion != null
                ? `Did you mean ${chatInputApplicationCommandMention(interaction.commandName, interaction.commandId)} \`${suggestion}\`?`
                : ""}`);
            return;
        }
        const quote = await db.get(`select * from quote_cache where reference=${choice.rowid}`);
        const embed = new EmbedBuilder()
            .setThumbnail(`https://s2.coinmarketcap.com/static/img/coins/128x128/${choice.id}.png`)
            .setColor(quote.percent_change_24h < 0 ? 0xed4245 : 0x3ba55c)
            .setTitle(`${choice.name} (${choice.symbol}-USD)`)
            .setURL(`https://coinmarketcap.com/currencies/${choice.slug}`)
            .setFooter({
            text: interaction.client.user.username,
            iconURL: interaction.client.user.displayAvatarURL()
        })
            .setFields({ name: "Price", value: `$${quote.price < 1 ? quote.price.toPrecision(4) : Math.round(quote.price * 100) / 100} ${quote.percent_change_24h < 0 ? "🔴" : "🟢"}` }, { name: "1h Change", value: `${Math.round(quote.percent_change_1h * 100) / 100}% ${quote.percent_change_1h < 0 ? "🔴" : "🟢"}`, inline: true }, { name: "24h Change", value: `${Math.round(quote.percent_change_24h * 100) / 100}% ${quote.percent_change_24h < 0 ? "🔴" : "🟢"}`, inline: true }, { name: "7d Change", value: `${Math.round(quote.percent_change_7d * 100) / 100}% ${quote.percent_change_7d < 0 ? "🔴" : "🟢"}`, inline: true }, { name: "24h Volume Change", value: `${Math.round(quote.volume_change_24h * 100) / 100}% ${quote.volume_change_24h < 0 ? "🔴" : "🟢"}`, inline: true }, { name: "Market Cap Dominance", value: `${Math.round(quote.market_cap_dominance * 100) / 100}%`, inline: true }, { name: "Last Updated", value: moment(quote.last_updated).format("YYYY-MM-DD @ HH:MM A") });
        interaction.reply({ embeds: [embed] });
    },
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        let i = 0;
        const filtered = cryptoSymbolList.filter(choice => {
            if (i < 25 && choice.toLowerCase().startsWith(focusedValue)) {
                i++;
                return true;
            }
            return false;
        });
        await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
    }
};
//# sourceMappingURL=coin.js.map