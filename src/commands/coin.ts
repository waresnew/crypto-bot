import {
    AutocompleteInteraction,
    chatInputApplicationCommandMention,
    ChatInputCommandInteraction,
    SlashCommandBuilder
} from "discord.js";
import {db} from "../database.js";
import didyoumean from "didyoumean";
import {CryptoApiData} from "../structs/cryptoapidata.js";
import {cryptoNameList, cryptoSymbolList} from "../utils.js";
import {makeButtons, makeEmbed, makeFavouritesMenu} from "../ui/coin/interfaceCreator.js";

export default {
    data: new SlashCommandBuilder()
        .setName("coin")
        .setDescription("Gets information about a cryptocurrency")
        .addStringOption(option =>
            option.setName("name").setDescription("The name/symbol of the coin").setAutocomplete(true)
        ),
    async execute(interaction: ChatInputCommandInteraction) {

        let input = interaction.options.getString("name");
        if (!input) {
            input = "btc";
        }

        const choice: CryptoApiData = await db.get("select * from cmc_cache where symbol=? collate nocase or name=? collate nocase", input);
        if (!choice) {
            const suggestion = didyoumean(input.toLowerCase(), cryptoSymbolList.concat(cryptoNameList));
            await interaction.reply(
                `Couldn't find a coin called \`${input}\`. ${suggestion != null
                    ? `Did you mean ${chatInputApplicationCommandMention(
                        interaction.commandName,
                        interaction.commandId
                    )} \`${suggestion}\`?`
                    : ""
                }`
            );
            return;
        }

        const embed = await makeEmbed(choice, interaction.client);
        const buttons = await makeButtons(choice, interaction);
        const favourites = await makeFavouritesMenu(interaction);
        await interaction.reply({embeds: [embed], components: [buttons, favourites], fetchReply: true});
    },
    async autocomplete(interaction: AutocompleteInteraction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        let i = 0;
        const filtered = cryptoSymbolList.filter(choice => {
            if (i < 25 && choice.toLowerCase().startsWith(focusedValue)) {
                i++;
                return true;
            }
            return false;
        });
        await interaction.respond(filtered.map(choice => ({name: choice, value: choice})));
    }

};
