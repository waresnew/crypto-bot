import {
    ModalSubmitInteraction,
    chatInputApplicationCommandMention,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ModalBuilder,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle,
    APIButtonComponentWithCustomId,
    StringSelectMenuInteraction,
    Message
} from "discord.js";
import {whatOptions} from "../../globals.js";
import {db, genSqlInsertCommand} from "../../database.js";
import {CryptoApiData} from "../../structs/cryptoapidata.js";
import {UserSetting, UserSettingType} from "../../structs/usersettings.js";
import {editComponents} from "../editComponents.js";
import {genCoinEmbed, genFavouritesMenu} from "./interfaceCreator.js";
import {InteractionProcessor} from "../abstractInteractionProcessor.js";

export default class CoinInteractionProcessor extends InteractionProcessor {
    static override async processModal(interaction: ModalSubmitInteraction): Promise<void> {
        const coin = await this.getChoiceFromEmbed(interaction.message);
        if (interaction.customId == "coin_alertsmodal") {
            const what = interaction.fields.getTextInputValue("alertsmodalstat").toLowerCase();
            const when = interaction.fields.getTextInputValue("alertsmodalvalue");
            if (!new RegExp(/^\d+$/).test(when)) {
                await interaction.reply({
                    content: "The threshold you specified was not a number. Make sure to specify **only** the number itself (leave out `%` and `$`)",
                    ephemeral: true
                });
                return undefined;
            }
            if (!whatOptions.includes(what)) {
                await interaction.reply({
                    content: "The stat you specified was invalid. Make sure to specify the exact string provided in the example (eg. `1h%` or `price`)",
                    ephemeral: true
                });
                return undefined;
            }
            const setting = new UserSetting();
            setting.id = interaction.user.id;
            setting.type = UserSettingType[UserSettingType.ALERT];
            setting.alertStat = what;
            setting.alertThreshold = Number(when);
            setting.alertToken = coin.id;
            const manageAlertLink = chatInputApplicationCommandMention("alerts", (await interaction.client.application.commands.fetch()).find(command => command.name == "alerts").id);
            if (Object.values(await db.get("select exists(select 1 from user_settings where alertToken=? and alertStat=?)", coin.id, what))[0]) {
                await interaction.reply({
                    content: `You are already tracking the \`${what}\` of \`${coin.name}\`. You may remove your existing alert with ${manageAlertLink}.`,
                    ephemeral: true
                });
                return undefined;
            }
            if (Object.values(await db.get("select count(id) from user_settings where id=? and type=?", setting.id, setting.type))[0] >= 10) {
                await interaction.reply({
                    content: `You can not have more than 10 active alerts. Please remove one before proceeding. ${manageAlertLink}`,
                    ephemeral: true
                });
                return undefined;
            }
            await genSqlInsertCommand(setting, "user_settings", new UserSetting());
            await interaction.reply({
                content: `Done! Added alert for ${coin.name}. Manage your alerts with ${manageAlertLink}`,
                ephemeral: true
            });
        }
    }

    static override async processButton(interaction: ButtonInteraction): Promise<void> {
        const coin = await this.getChoiceFromEmbed(interaction.message);
        if (interaction.customId == "coin_alerts") {
            whatOptions.sort((a, b) => a.length - b.length);
            const modal = new ModalBuilder()
                .setCustomId("coin_alertsmodal")
                .setTitle(`Adding Alert for ${coin.name}`)
                .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder()
                    .setCustomId("coin_alertsmodalstat")
                    .setLabel("Which stat do you want to track?")
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(whatOptions[whatOptions.length - 1].length)
                    .setMinLength(1)
                    .setPlaceholder(whatOptions.join(", "))
                    .setRequired(true)))
                .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder()
                    .setCustomId("coin_alertsmodalvalue")
                    .setLabel("At what threshold should you be alerted?")
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(10)
                    .setMinLength(1)
                    .setPlaceholder("20000")
                    .setRequired(true)));
            await interaction.showModal(modal);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            interaction.awaitModalSubmit({
                time: 60000,
                filter: j => j.user.id == interaction.user.id
            }).then(modalResult => this.processModal(modalResult)).catch(err => {
                console.log(err);
                //i.followUp("Alert form timed out. Did you take more than 1 minute to submit?"); //todo fix this
            });
        } else if (interaction.customId == "coin_setfav") {
            if (interaction.component.label == "Favourite") {
                const setting = new UserSetting();
                setting.id = interaction.user.id;
                setting.favouriteCrypto = coin.id;
                setting.type = UserSettingType[UserSettingType.FAVOURITE_CRYPTO];
                await genSqlInsertCommand(setting, "user_settings", new UserSetting());
            } else {
                await db.run("delete from user_settings where id=? and favouriteCrypto=?", interaction.user.id, coin.id);
            }
            const newComponents = await editComponents(interaction.message, async (builder) => {
                if (builder instanceof ButtonBuilder) {
                    if ((builder.data as APIButtonComponentWithCustomId).custom_id == "coin_setfav") {
                        return builder.setLabel(builder.data.label == "Favourite" ? "Unfavourite" : "Favourite")
                            .setStyle(builder.data.label == "Favourite" ? ButtonStyle.Primary : ButtonStyle.Secondary);
                    } else {
                        return builder;
                    }
                } else if (builder instanceof StringSelectMenuBuilder) {
                    return builder.data.custom_id == "coin_favCoins" ? await genFavouritesMenu(interaction) : builder;
                } else {
                    return builder;
                }
            });
            await interaction.update({embeds: interaction.message.embeds, components: [...newComponents]});
        }
        return undefined;
    }

    static override async processStringSelect(interaction: StringSelectMenuInteraction): Promise<void> {

        const selected = interaction.values[0];
        if (selected == "default") {
            await interaction.reply({content: "Favourite a coin to add it to the list!", ephemeral: true});
            return undefined;
        }
        const coin = await db.get("select * from cmc_cache where id=?", selected) as CryptoApiData;
        await interaction.update({
            components: interaction.message.components,
            embeds: [genCoinEmbed(coin, interaction.client)]
        });
    }

    static async getChoiceFromEmbed(message: Message): Promise<CryptoApiData> {
        const pictureUrl = message.embeds[0].data.thumbnail.url;
        const firstToken = "https://s2.coinmarketcap.com/static/img/coins/128x128/", secondToken = ".png";
        const id = pictureUrl.substring(pictureUrl.indexOf(firstToken) + firstToken.length, pictureUrl.indexOf(secondToken));
        return await db.get("select * from cmc_cache where id=?", id) as CryptoApiData;
    }
}