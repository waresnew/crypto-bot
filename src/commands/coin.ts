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
    TextInputStyle,
    ModalSubmitInteraction,
    ButtonComponent,
    StringSelectMenuBuilder,
    StringSelectMenuComponent,
    BaseInteraction
} from "discord.js";
import moment from "moment";
import { db, genSqlInsertCommand } from "../database.js";
import didyoumean from "didyoumean";
import { CryptoApiData } from "../structs/cryptoapidata.js";
import { UserSetting, UserSettingType } from "../structs/usersettings.js";
export const cryptoSymbolList: string[] = [];
export const cryptoNameList: string[] = [];
const whatOptions = ["price", "1h%", "24h%", "7d%", "volume%", "dominance"];
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

        let embed = genCoinEmbed(choice, interaction);
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
            embed = genCoinEmbed(choice, i);
            await i.update({ components: i.message.components, embeds: [embed] });
        });
        const buttonCollector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
        buttonCollector.on("collect", i => {
            processButtons(i, choice);
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        buttonCollector.on("end", _collected => {
            const disabledComponents = [];
            for (const row of response.components) {
                const disabled = new ActionRowBuilder();
                for (const component of row.components) {
                    if (component instanceof ButtonComponent) {
                        disabled.addComponents(ButtonBuilder.from(component).setDisabled(true));
                    } else if (component instanceof StringSelectMenuComponent) {
                        disabled.addComponents(StringSelectMenuBuilder.from(component).setDisabled(true));
                    }
                }
                if (disabled.components.length > 0) {
                    disabledComponents.push(disabled);
                }
            }
            interaction.editReply({
                // @ts-ignore
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
async function processButtons(interaction: ButtonInteraction, coin: CryptoApiData) {
    if (interaction.customId == "alerts") {
        whatOptions.sort((a, b) => a.length - b.length);
        const modal = new ModalBuilder()
            .setCustomId("alertsmodal")
            .setTitle(`Adding Alert for ${coin.name}`)
            .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder()
                .setCustomId("alertsmodalstat")
                .setLabel("Which stat do you want to track?")
                .setStyle(TextInputStyle.Short)
                .setMaxLength(whatOptions[whatOptions.length - 1].length)
                .setMinLength(1)
                .setPlaceholder(whatOptions.join(", "))
                .setRequired(true)))
            .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder()
                .setCustomId("alertsmodalvalue")
                .setLabel("At what threshold should you be alerted?")
                .setStyle(TextInputStyle.Short)
                .setMaxLength(10)
                .setMinLength(1)
                .setPlaceholder("20000")
                .setRequired(true)));
        await interaction.showModal(modal);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        interaction.awaitModalSubmit({ time: 60000, filter: j => j.user.id == interaction.user.id }).then(modalResult => processModals(modalResult, coin)).catch(err => {
            console.log(err);
            //i.followUp("Alert form timed out. Did you take more than 1 minute to submit?"); //todo fix this
        });
    } else if (interaction.customId == "setfav") {
        if (interaction.component.label == "Favourite") {
            const setting = new UserSetting();
            setting.id = interaction.user.id;
            setting.favouriteCrypto = coin.id;
            setting.type = UserSettingType[UserSettingType.FAVOURITE_CRYPTO];
            await genSqlInsertCommand(setting, "user_settings", new UserSetting());
        } else {
            await db.run("delete from user_settings where id=? and favouriteCrypto=?", interaction.user.id, coin.id);
        }
        const newComponents = [];
        for (const row of interaction.message.components) {
            const rowBuilder = new ActionRowBuilder();
            for (const component of row.components) {
                if (component instanceof ButtonComponent) {
                    const buttonBuilder = ButtonBuilder.from(component);
                    if (component.customId == "setfav") {
                        buttonBuilder.setLabel(component.data.label == "Favourite" ? "Unfavourite" : "Favourite")
                            .setStyle(component.data.label == "Favourite" ? ButtonStyle.Secondary : ButtonStyle.Primary);
                    }
                    rowBuilder.addComponents(buttonBuilder);
                } else if (component instanceof StringSelectMenuComponent) {
                    let builder = StringSelectMenuBuilder.from(component);
                    if (component.customId == "favCoins") {
                        builder = await genFavouritesMenu(interaction);
                    }
                    rowBuilder.addComponents(builder);
                }
            }
            if (rowBuilder.components.length > 0) {
                newComponents.push(rowBuilder);
            }
        }
        // @ts-ignore
        interaction.update({ embeds: interaction.message.embeds, components: [...newComponents] });
    }
}
async function processModals(modalResult: ModalSubmitInteraction, coin: CryptoApiData) {
    if (modalResult.customId == "alertsmodal") {
        const what = modalResult.fields.getTextInputValue("alertsmodalstat").toLowerCase();
        const when = modalResult.fields.getTextInputValue("alertsmodalvalue");
        if (!new RegExp(/^\d+$/).test(when)) {
            modalResult.reply({ content: "The threshold you specified was not a number. Make sure to specify **only** the number itself (leave out `%` and `$`)", ephemeral: true });
            return;
        }
        if (!whatOptions.includes(what)) {
            modalResult.reply({ content: "The stat you specified was invalid. Make sure to specify the exact string provided in the example (eg. `1h%` or `price`)", ephemeral: true });
            return;
        }
        let setting: UserSetting = new UserSetting();
        setting = new UserSetting();
        setting.id = modalResult.user.id;
        setting.type = UserSettingType[UserSettingType.ALERT];
        setting.alertStat = what;
        setting.alertThreshold = Number(when);
        setting.alertToken = coin.id;
        const manageAlertLink = chatInputApplicationCommandMention("managealerts", (await modalResult.client.application.commands.fetch()).find(command => command.name == "managealerts").id);
        if (Object.values(await db.get("select exists(select 1 from user_settings where alertToken=? and alertStat=?)", coin.id, what))[0]) {
            modalResult.reply({ content: `You are already tracking the \`${what}\` of \`${coin.name}\`. You may remove your existing alert with ${manageAlertLink}.`, ephemeral: true });
            return;
        }
        if (Object.values(await db.get("select count(id) from user_settings where id=? and type=?", setting.id, setting.type))[0] >= 10) {
            modalResult.reply({ content: `You can not have more than 10 active alerts. Please remove one before proceeding. ${manageAlertLink}`, ephemeral: true });
            return;
        }
        await genSqlInsertCommand(setting, "user_settings", new UserSetting());
        modalResult.reply({ content: `Done! Added alert for ${coin.name}. Manage your alerts with ${manageAlertLink}`, ephemeral: true });
    }
}
function genCoinEmbed(choice: CryptoApiData, interaction: BaseInteraction) {
    return new EmbedBuilder()
        .setThumbnail(`https://s2.coinmarketcap.com/static/img/coins/128x128/${choice.id}.png`)
        .setColor(choice.percent_change_24h < 0 ? 0xed4245 : 0x3ba55c)
        .setTitle(`${choice.name} (${choice.symbol}-USD)`)
        .setURL(`https://coinmarketcap.com/currencies/${choice.slug}`)
        .setFooter({
            text: interaction.client.user.username,
            iconURL: interaction.client.user.displayAvatarURL()
        })
        .setFields({ name: "Price", value: `$${choice.price < 1 ? choice.price.toPrecision(4) : Math.round(choice.price * 100) / 100} ${choice.percent_change_24h < 0 ? "🔴" : "🟢"}` },
            { name: "1h Change", value: `${Math.round(choice.percent_change_1h * 100) / 100}% ${choice.percent_change_1h < 0 ? "🔴" : "🟢"}`, inline: true },
            { name: "24h Change", value: `${Math.round(choice.percent_change_24h * 100) / 100}% ${choice.percent_change_24h < 0 ? "🔴" : "🟢"}`, inline: true },
            { name: "7d Change", value: `${Math.round(choice.percent_change_7d * 100) / 100}% ${choice.percent_change_7d < 0 ? "🔴" : "🟢"}`, inline: true },
            { name: "24h Volume Change", value: `${Math.round(choice.volume_change_24h * 100) / 100}% ${choice.volume_change_24h < 0 ? "🔴" : "🟢"}`, inline: true },
            { name: "Market Cap Dominance", value: `${Math.round(choice.market_cap_dominance * 100) / 100}%`, inline: true },
            { name: "Last Updated", value: moment(choice.last_updated).format("YYYY-MM-DD @ HH:MM A") },
        );
}

async function genFavouritesMenu(interaction: BaseInteraction) {
    let selectFavs = new StringSelectMenuBuilder()
        .setCustomId("favCoins")
        .setPlaceholder("Quickly access your favourites...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const favs = await db.all("select favouriteCrypto from user_settings where type=? and id=?", UserSettingType[UserSettingType.FAVOURITE_CRYPTO], interaction.user.id);

    for (let i = 0; i < favs.length; i++) {
        const row = favs[i];
        const favName = await db.get("select name from cmc_cache where id=?", row.favouriteCrypto);
        if (favName) {
            selectFavs = selectFavs.addOptions({ label: favName.name, value: row.favouriteCrypto.toString() });
        }
        if (i == favs.length - 1) {
            if (selectFavs.options.length == 0) {
                selectFavs = selectFavs.addOptions({ label: "Favourite a coin to add it here!", value: "default" });
            }
        }
    }

    return selectFavs;

}