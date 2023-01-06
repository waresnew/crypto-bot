import {
    chatInputApplicationCommandMention,
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    AutocompleteInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    StringSelectMenuBuilder
} from "discord.js";
import { db } from "../database.js";
import didyoumean from "didyoumean";
import { CryptoApiData } from "../structs/cryptoapidata.js";
import { genCoinEmbed, genFavouritesMenu } from "../ui/coin/createInterfaces.js";
import { processButtons } from "../ui/coin/processInteractions.js";
import { editComponents } from "../ui/editComponents.js";
import { cryptoNameList, cryptoSymbolList } from "../globals.js";

export default {
    data: new SlashCommandBuilder()
        .setName("coin")
        .setDescription("Gets information about a cryptocurrency")
        .addStringOption(option =>
            option.setName("name").setDescription("The name/symbol of the coin").setAutocomplete(true)
        ),
    async execute(interaction: ChatInputCommandInteraction) {

        const input = interaction.options.getString("name");
        if (!input) {
            interaction.reply("Please specify a coin to lookup.");
            return;
        }

        let choice: CryptoApiData = await db.get("select * from cmc_cache where symbol=? collate nocase or name=? collate nocase", input);
        if (!choice) {
            const suggestion = didyoumean(input.toLowerCase(), cryptoSymbolList.concat(cryptoNameList));
            interaction.reply(
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

        let embed = genCoinEmbed(choice, interaction.client);
        const favourited = Object.values(await db.get("select exists(select 1 from user_settings where id=? and favouriteCrypto=?)", interaction.user.id, choice.id))[0];
        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("alerts")
                    .setLabel("Add Alert")
                    .setEmoji("🔔")
                    .setStyle(ButtonStyle.Primary)
            )
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("setfav")
                    .setLabel(favourited ? "Unfavourite" : "Favourite")
                    .setEmoji("⭐")
                    .setStyle(favourited ? ButtonStyle.Secondary : ButtonStyle.Primary)
            );

        const favourites = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(await genFavouritesMenu(interaction));
        const response = await interaction.reply({ embeds: [embed], components: [buttons, favourites], fetchReply: true });
        const favouriteCollector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });
        favouriteCollector.on("collect", async i => {
            const selected = i.values[0];
            if (selected == "default") {
                i.reply({ content: "Favourite a coin to add it to the list!", ephemeral: true });
                return;
            }
            choice = (await db.get("select * from cmc_cache where id=?", selected)) as CryptoApiData;
            embed = genCoinEmbed(choice, i.client);
            await i.update({ components: i.message.components, embeds: [embed] });
        });
        const buttonCollector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
        buttonCollector.on("collect", i => {
            processButtons(i, choice);
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        buttonCollector.on("end", async _collected => {
            const disabledComponents = await editComponents(response, async (builder) => {
                return builder.setDisabled(true);
            });
            interaction.editReply({
                content: "This message is no longer receiving input.", embeds: [embed], components: [...disabledComponents]
            });
        });
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
        await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
    }

};
