import { chatInputApplicationCommandMention, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { db } from "../database.js";
import didyoumean from "didyoumean";
import { genCoinEmbed, genFavouritesMenu } from "../ui/coin/interfaceCreator.js";
import { cryptoNameList, cryptoSymbolList } from "../globals.js";
export default {
    data: new SlashCommandBuilder()
        .setName("coin")
        .setDescription("Gets information about a cryptocurrency")
        .addStringOption(option => option.setName("name").setDescription("The name/symbol of the coin").setAutocomplete(true)),
    async execute(interaction) {
        const input = interaction.options.getString("name");
        if (!input) {
            await interaction.reply("Please specify a coin to lookup.");
            return;
        }
        const choice = await db.get("select * from cmc_cache where symbol=? collate nocase or name=? collate nocase", input);
        if (!choice) {
            const suggestion = didyoumean(input.toLowerCase(), cryptoSymbolList.concat(cryptoNameList));
            await interaction.reply(`Couldn't find a coin called \`${input}\`. ${suggestion != null
                ? `Did you mean ${chatInputApplicationCommandMention(interaction.commandName, interaction.commandId)} \`${suggestion}\`?`
                : ""}`);
            return;
        }
        const embed = genCoinEmbed(choice, interaction.client);
        const favourited = Object.values(await db.get("select exists(select 1 from user_settings where id=? and favouriteCrypto=?)", interaction.user.id, choice.id))[0];
        const buttons = new ActionRowBuilder()
            .addComponents(new ButtonBuilder()
            .setCustomId("coin_alerts")
            .setLabel("Add alert")
            .setEmoji("🔔")
            .setStyle(ButtonStyle.Primary))
            .addComponents(new ButtonBuilder()
            .setCustomId("coin_setfav")
            .setLabel(favourited ? "Unfavourite" : "Favourite")
            .setEmoji("⭐")
            .setStyle(favourited ? ButtonStyle.Secondary : ButtonStyle.Primary));
        const favourites = new ActionRowBuilder().addComponents(await genFavouritesMenu(interaction));
        await interaction.reply({ embeds: [embed], components: [buttons, favourites], fetchReply: true });
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