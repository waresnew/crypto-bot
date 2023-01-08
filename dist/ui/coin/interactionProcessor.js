import { ActionRowBuilder, chatInputApplicationCommandMention, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { db, genSqlInsertCommand, idToApiData } from "../../database.js";
import { UserSetting, UserSettingType } from "../../structs/usersettings.js";
import InteractionProcessor from "../abstractInteractionProcessor.js";
import { makeButtons, makeEmbed, makeFavouritesMenu } from "./interfaceCreator.js";
import CryptoStat from "../../structs/cryptoStat.js";
export default class CoinInteractionProcessor extends InteractionProcessor {
    static async processModal(interaction) {
        const coin = await this.getChoiceFromEmbed(interaction.message);
        if (interaction.customId.startsWith("coin_alertsmodal")) {
            const what = interaction.fields.getTextInputValue(`coin_alertsmodalstat_${interaction.user.id}`).toLowerCase();
            const when = interaction.fields.getTextInputValue(`coin_alertsmodalvalue_${interaction.user.id}`);
            if (when.charAt(0) != "<" && when.charAt(0) != ">") {
                await interaction.reply({
                    content: "The specified threshold did not have a `<` or `>` sign in front of it. Please use `<` if you want to be alerted when the value is below your threshold, and `>` if you want to know when the value is above.",
                    ephemeral: true
                });
                return;
            }
            if (isNaN(Number(when.substring(1))) || isNaN(parseFloat(when.substring(1)))) {
                await interaction.reply({
                    content: "The specified threshold was not a number. Make sure to remove percent and dollar signs from your input.)",
                    ephemeral: true
                });
                return;
            }
            if (!CryptoStat.listShorts().includes(what)) {
                await interaction.reply({
                    content: "The specified stat was invalid. Make sure to specify the exact string provided in the example (eg. `1h%` or `price`)",
                    ephemeral: true
                });
                return;
            }
            const setting = new UserSetting();
            setting.id = interaction.user.id;
            setting.type = UserSettingType[UserSettingType.ALERT];
            setting.alertStat = what;
            setting.alertThreshold = Number(when.substring(1));
            setting.alertToken = coin.id;
            setting.alertDirection = when.charAt(0);
            const manageAlertLink = chatInputApplicationCommandMention("alerts", (await interaction.client.application.commands.fetch()).find((command)=>command.name == "alerts").id);
            if ((await db.get("select count(id) from user_settings where id=? and type=?", setting.id, setting.type))["count(id)"] >= 25) {
                //limit to 25 bc stringselectmenus hax a max of 25 entries
                await interaction.reply({
                    content: `You can not have more than 25 alerts set. Please delete one before proceeding. ${manageAlertLink}`,
                    ephemeral: true
                });
                return;
            }
            await genSqlInsertCommand(setting, "user_settings", new UserSetting());
            await interaction.reply({
                content: `Done! Added alert for ${coin.name}. Manage your alerts with ${manageAlertLink}`,
                ephemeral: true
            });
        }
    }
    static async processButton(interaction) {
        const coin = await this.getChoiceFromEmbed(interaction.message);
        if (interaction.customId.startsWith("coin_alerts")) {
            const sortedOptions = CryptoStat.listShorts().sort((a, b)=>a.length - b.length);
            const modal = new ModalBuilder().setCustomId(`coin_alertsmodal_${interaction.user.id}`).setTitle(`Adding alert for ${coin.name}`).addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(`coin_alertsmodalstat_${interaction.user.id}`).setLabel("Which stat do you want to track?").setStyle(TextInputStyle.Short).setMaxLength(sortedOptions[sortedOptions.length - 1].length).setMinLength(sortedOptions[0].length).setPlaceholder(sortedOptions.join(", ")).setRequired(true))).addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(`coin_alertsmodalvalue_${interaction.user.id}`).setLabel("At what threshold should you be alerted?").setStyle(TextInputStyle.Short).setMaxLength(10) //limit so things like float precision don't appear
            .setMinLength(2).setPlaceholder("eg. <-20 for less than -20, >10 for greater than 10").setRequired(true)));
            await interaction.showModal(modal);
        } else if (interaction.customId.startsWith("coin_setfav")) {
            if (interaction.component.label == "Favourite") {
                const setting = new UserSetting();
                setting.id = interaction.user.id;
                setting.favouriteCrypto = coin.id;
                setting.type = UserSettingType[UserSettingType.FAVOURITE_CRYPTO];
                await genSqlInsertCommand(setting, "user_settings", new UserSetting());
            } else {
                await db.run("delete from user_settings where id=? and favouriteCrypto=?", interaction.user.id, coin.id);
            }
            const newButtons = await makeButtons(coin, interaction);
            const newMenu = await makeFavouritesMenu(interaction);
            await interaction.update({
                embeds: interaction.message.embeds,
                components: [
                    newButtons,
                    newMenu
                ]
            });
        } else if (interaction.customId.startsWith("coin_refresh")) {
            await interaction.update({
                components: interaction.message.components,
                embeds: [
                    await makeEmbed(coin, interaction.client)
                ]
            });
        }
    }
    static async processStringSelect(interaction) {
        const selected = interaction.values[0];
        if (selected == "default") {
            await interaction.reply({
                content: "Favourite a coin to add it to the list!",
                ephemeral: true
            });
            return;
        }
        const coin = await idToApiData(selected);
        await interaction.update({
            components: interaction.message.components,
            embeds: [
                await makeEmbed(coin, interaction.client)
            ]
        });
    }
    static async getChoiceFromEmbed(message) {
        const pictureUrl = message.embeds[0].data.thumbnail.url;
        const firstToken = "https://s2.coinmarketcap.com/static/img/coins/128x128/", secondToken = ".png";
        const id = pictureUrl.substring(pictureUrl.indexOf(firstToken) + firstToken.length, pictureUrl.indexOf(secondToken));
        return await idToApiData(id);
    }
}

//# sourceMappingURL=interactionProcessor.js.map