import {
    chatInputApplicationCommandMention,
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    AutocompleteInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    ButtonInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import moment from "moment";
import { db } from "../database.js";
import didyoumean from "didyoumean";
import { CryptoApiData, CryptoQuote } from "../api/cmcApi.js";
export const cryptoSymbolList: string[] = [];
export const cryptoNameList: string[] = [];
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

        const choice: CryptoApiData = await db.get("select * from cmc_cache where symbol=? collate nocase or name=? collate nocase", input);
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

        const quote: CryptoQuote = await db.get(`select * from quote_cache where reference=${choice.rowid}`);
        const embed = new EmbedBuilder()
            .setThumbnail(`https://s2.coinmarketcap.com/static/img/coins/128x128/${choice.id}.png`)
            .setColor(quote.percent_change_24h < 0 ? 0xed4245 : 0x3ba55c)
            .setTitle(`${choice.name} (${choice.symbol}-USD)`)
            .setURL(`https://coinmarketcap.com/currencies/${choice.slug}`)
            .setFooter({
                text: interaction.client.user.username,
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setFields({ name: "Price", value: `$${quote.price < 1 ? quote.price.toPrecision(4) : Math.round(quote.price * 100) / 100} ${quote.percent_change_24h < 0 ? "🔴" : "🟢"}` },
                { name: "1h Change", value: `${Math.round(quote.percent_change_1h * 100) / 100}% ${quote.percent_change_1h < 0 ? "🔴" : "🟢"}`, inline: true },
                { name: "24h Change", value: `${Math.round(quote.percent_change_24h * 100) / 100}% ${quote.percent_change_24h < 0 ? "🔴" : "🟢"}`, inline: true },
                { name: "7d Change", value: `${Math.round(quote.percent_change_7d * 100) / 100}% ${quote.percent_change_7d < 0 ? "🔴" : "🟢"}`, inline: true },
                { name: "24h Volume Change", value: `${Math.round(quote.volume_change_24h * 100) / 100}% ${quote.volume_change_24h < 0 ? "🔴" : "🟢"}`, inline: true },
                { name: "Market Cap Dominance", value: `${Math.round(quote.market_cap_dominance * 100) / 100}%`, inline: true },
                { name: "Last Updated", value: moment(quote.last_updated).format("YYYY-MM-DD @ HH:MM A") },
            );
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("alerts")
                    .setLabel("Add Alert")
                    .setEmoji("🔔")
                    .setStyle(ButtonStyle.Primary)
            );
        const response = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        const buttonCollector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
        buttonCollector.on("collect", i => {
            this.processButtons(interaction, i);
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        buttonCollector.on("end", _collected => {
            interaction.editReply({ content: "This message is no longer receiving input.", embeds: [embed], components: [] });
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
    },
    async processButtons(interaction: ChatInputCommandInteraction, i: ButtonInteraction) {
        if (i.user.id == interaction.user.id) {
            if (i.customId == "alerts") {
                const modal = new ModalBuilder()
                    .setCustomId("alertsmodal")
                    .setTitle("Add Alert")
                    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder()
                        .setCustomId("alertsmodalstat")
                        .setLabel("Which stat do you want to track?")
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(20)
                        .setMinLength(1)
                        .setPlaceholder("price, 1h%, 24h%, 7d%, volume%, dominance")
                        .setRequired(true)))
                    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder()
                        .setCustomId("alertsmodalvalue")
                        .setLabel("At what threshold should you be alerted?")
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(30)
                        .setMinLength(1)
                        .setPlaceholder("20000")
                        .setRequired(true)));
                await i.showModal(modal);
                //todo validate response (eg. has to be a number)
                i.awaitModalSubmit({ time: 60000, filter: j => j.user.id == i.user.id }).then(modalResult => {
                    modalResult.reply(`${modalResult.fields.getTextInputValue("alertsmodalstat")}, ${modalResult.fields.getTextInputValue("alertsmodalvalue")}`);
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                }).catch(_err => {
                    i.followUp("Alert form timed out. Did you take more than 1 minute to submit?");
                });
            }
        } else {
            i.reply({ content: "Error: You do not have permission to interact with that.", ephemeral: true });
        }
    },
    async processModals() {

    }
};
