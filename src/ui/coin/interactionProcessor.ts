import {db, genSqlInsertCommand, idToApiData} from "../../database";
import {CryptoApiData} from "../../structs/cryptoapidata";
import {UserSetting, UserSettingType} from "../../structs/usersettings";
import InteractionProcessor from "../abstractInteractionProcessor";
import {makeButtons, makeEmbed, makeFavouritesMenu} from "./interfaceCreator";
import CryptoStat from "../../structs/cryptoStat";
import {
    APIButtonComponentWithCustomId,
    APIMessage,
    APIMessageComponentButtonInteraction,
    APIMessageComponentSelectMenuInteraction,
    APIModalSubmitInteraction,
    ComponentType,
    InteractionResponseType,
    MessageFlags,
    TextInputStyle
} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {APIModalInteractionResponseCallbackData} from "discord-api-types/payloads/v10/_interactions/responses";
import {commandIds} from "../../utils";
import {analytics} from "../../analytics/segment";

export default class CoinInteractionProcessor extends InteractionProcessor {
    static override async processModal(interaction: APIModalSubmitInteraction, http: FastifyReply): Promise<void> {
        const coin = await this.getChoiceFromEmbed(interaction.message);
        if (interaction.data.custom_id.startsWith("coin_alertsmodal")) {
            const what = interaction.data.components.find(entry => entry.components[0].custom_id == `coin_alertsmodalstat_${interaction.user.id}`).components[0].value.toLowerCase();
            const when = interaction.data.components.find(entry => entry.components[0].custom_id == `coin_alertsmodalvalue_${interaction.user.id}`).components[0].value;
            if (!what || !when) {
                analytics.track({
                    userId: interaction.user.id,
                    event: "Alert Creation Failed",
                    properties: {
                        reason: "Missing Fields",
                        coin: coin.symbol
                    }
                });
                await http.send({
                    type: InteractionResponseType.ChannelMessageWithSource, data: {
                        content: "Error: You did not specify a stat or a threshold. Please try again.",
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }
            if (when.charAt(0) != "<" && when.charAt(0) != ">") {
                analytics.track({
                    userId: interaction.user.id,
                    event: "Alert Creation Failed",
                    properties: {
                        reason: "Invalid Threshold Character",
                        coin: coin.symbol
                    }
                });
                await http.send({
                    type: InteractionResponseType.ChannelMessageWithSource, data: {
                        content: "Error: The specified threshold did not have a `<` or `>` sign in front of it. Please use `<` if you want to be alerted when the value is below your threshold, and `>` if you want to know when the value is above. For example, entering `>20` will mean you will be alerted when the value is above 20.",
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }
            if (when.length > 13) {
                analytics.track({
                    userId: interaction.user.id,
                    event: "Alert Creation Failed",
                    properties: {
                        reason: "When field too long",
                        coin: coin.symbol
                    }
                });
                await http.send({
                    type: InteractionResponseType.ChannelMessageWithSource, data: {
                        content: "Error: The threshold you specified was too long. Please note that we only support thresholds from negative one billion to positive one billion.",
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }
            if (isNaN(Number(when.substring(1))) || isNaN(parseFloat(when.substring(1)))) {
                analytics.track({
                    userId: interaction.user.id,
                    event: "Alert Creation Failed",
                    properties: {
                        reason: "Invalid Threshold Number",
                        coin: coin.symbol
                    }
                });
                await http.send({
                    type: InteractionResponseType.ChannelMessageWithSource, data: {
                        content: "Error: The specified threshold was not a number. Make sure to remove percent and dollar signs from your input. For example, entering `>20` will mean you will be alerted when the value is above 20.",
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }
            if (Number(when.substring(1)) > 1000000000) {
                analytics.track({
                    userId: interaction.user.id,
                    event: "Alert Creation Failed",
                    properties: {
                        reason: "Threshold too high",
                        coin: coin.symbol
                    }
                });
                await http.send({
                    type: InteractionResponseType.ChannelMessageWithSource, data: {
                        content: "Error: The threshold you specified was too high. Please ensure it is at most one billion.",
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }
            if (!CryptoStat.listShorts().includes(what)) {
                analytics.track({
                    userId: interaction.user.id,
                    event: "Alert Creation Failed",
                    properties: {
                        reason: "Invalid Stat",
                        coin: coin.symbol
                    }
                });
                await http.send({
                    type: InteractionResponseType.ChannelMessageWithSource, data: {
                        content: "Error: The specified stat was invalid. Make sure to specify the exact string provided in the example. Our currently supported stats are: `" + CryptoStat.listShorts().join("`, `") + "`.",
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }
            const alert = new UserSetting();
            alert.id = interaction.user.id;
            alert.type = UserSettingType[UserSettingType.ALERT];
            alert.alertStat = what;
            alert.alertThreshold = Number(when.substring(1));
            alert.alertToken = coin.id;
            alert.alertDirection = when.charAt(0);
            const manageAlertLink = `</alerts:${commandIds.get("alerts")}>`;
            if (Object.values(await db.get("select exists(select 1 from user_settings where id=? and type=? and alertToken=? and alertStat=? and alertDirection=?)", interaction.user.id, UserSettingType[UserSettingType.ALERT], alert.alertToken, alert.alertStat, alert.alertDirection))[0]) {
                analytics.track({
                    userId: interaction.user.id,
                    event: "Alert Creation Failed",
                    properties: {
                        reason: "Duplicate/redundant Alert",
                        coin: coin.symbol
                    }
                });
                await http.send({
                    type: InteractionResponseType.ChannelMessageWithSource, data: {
                        content: `Error: You already have an alert that checks if the ${CryptoStat.shortToLong(alert.alertStat)} of ${coin.name} is ${alert.alertDirection == "<" ? "less than" : "greater than"} a certain amount.\nAdding another alert of this type would be redundant. Please delete your old one from ${manageAlertLink} before proceeding.`,
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }
            if ((await db.get("select count(id) from user_settings where id=? and type=?", alert.id, alert.type))["count(id)"] >= 25) {
                //limit to 25 bc stringselectmenus hax a max of 25 entries
                analytics.track({
                    userId: interaction.user.id,
                    event: "Alert Creation Failed",
                    properties: {
                        reason: "Too many alerts",
                        coin: coin.symbol
                    }
                });
                await http.send({
                    type: InteractionResponseType.ChannelMessageWithSource, data: {
                        content: `Error: You can not have more than 25 alerts set. Please delete one before proceeding. ${manageAlertLink}`,
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }
            analytics.track({
                userId: interaction.user.id,
                event: "Alert Created",
                properties: {
                    coin: coin.symbol,
                    stat: alert.alertStat,
                    threshold: alert.alertThreshold,
                    direction: alert.alertDirection
                }
            });
            await genSqlInsertCommand(alert, "user_settings", new UserSetting());
            await http.send({
                type: InteractionResponseType.ChannelMessageWithSource, data: {
                    content: `Done! Added alert for ${coin.name}. Manage your alerts with ${manageAlertLink}`,
                    flags: MessageFlags.Ephemeral
                }
            });
        }
    }

    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply): Promise<void> {
        const coin = await this.getChoiceFromEmbed(interaction.message);
        if (interaction.data.custom_id.startsWith("coin_alerts")) {
            const sortedOptions = CryptoStat.listShorts().sort((a, b) => a.length - b.length);
            const modal: APIModalInteractionResponseCallbackData = {
                custom_id: `coin_alertsmodal_${interaction.user.id}`,
                title: `Adding alert for ${coin.name}`,
                components: [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            {
                                type: ComponentType.TextInput,
                                label: "Which stat do you want to track?",
                                custom_id: `coin_alertsmodalstat_${interaction.user.id}`,
                                style: TextInputStyle.Short,
                                placeholder: sortedOptions.join(", "),
                                required: true
                            }
                        ]
                    },
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            {
                                type: ComponentType.TextInput,
                                custom_id: `coin_alertsmodalvalue_${interaction.user.id}`,
                                label: "At what threshold should you be alerted?",
                                style: TextInputStyle.Short,
                                placeholder: "eg. <-20 for less than -20, >10 for greater than 10",
                                required: true
                            }
                        ]
                    }
                ]
            };
            await http.send({type: InteractionResponseType.Modal, data: modal});
        } else if (interaction.data.custom_id.startsWith("coin_setfav")) {
            if (!await db.get("select * from user_settings where id=? and type=? and favouriteCrypto=?", interaction.user.id, UserSettingType[UserSettingType.FAVOURITE_CRYPTO], coin.id)) {
                if ((await db.get("select count(id) from user_settings where id=? and type=?", interaction.user.id, UserSettingType[UserSettingType.FAVOURITE_CRYPTO]))["count(id)"] >= 25) {
                    await http.send({
                        type: InteractionResponseType.ChannelMessageWithSource, data: {
                            content: "Error: You can not have more than 25 favourited cryptos.",
                            flags: MessageFlags.Ephemeral
                        }
                    });
                    return;
                }
                const setting = new UserSetting();
                setting.id = interaction.user.id;
                setting.favouriteCrypto = coin.id;
                setting.type = UserSettingType[UserSettingType.FAVOURITE_CRYPTO];
                analytics.track({
                    userId: interaction.user.id,
                    event: "Favourited a coin",
                    properties: {
                        coin: coin.symbol
                    }
                });
                await genSqlInsertCommand(setting, "user_settings", new UserSetting());
            } else {
                if ((interaction.message.components[0].components.find(c => c.type == ComponentType.Button && (c as APIButtonComponentWithCustomId).custom_id == interaction.data.custom_id) as APIButtonComponentWithCustomId).label == "Favourite") {
                    await http.send({
                        type: InteractionResponseType.ChannelMessageWithSource, data: {
                            content: "Error: You already have this coin favourited.",
                            flags: MessageFlags.Ephemeral
                        }
                    });
                    return;
                }
                analytics.track({
                    userId: interaction.user.id,
                    event: "Unfavourited a coin",
                    properties: {
                        coin: coin.symbol
                    }
                });
                await db.run("delete from user_settings where id=? and favouriteCrypto=?", interaction.user.id, coin.id);
            }
            const newButtons = await makeButtons(coin, interaction);
            const newMenu = await makeFavouritesMenu(interaction);
            await http.send({
                type: InteractionResponseType.UpdateMessage,
                data: {embeds: interaction.message.embeds, components: [newButtons, newMenu]}
            });
        } else if (interaction.data.custom_id.startsWith("coin_refresh")) {
            analytics.track({
                userId: interaction.user.id,
                event: "Refreshed a coin",
                properties: {
                    coin: coin.symbol
                }
            });
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    components: [await makeButtons(await this.getChoiceFromEmbed(interaction.message), interaction), await makeFavouritesMenu(interaction)],
                    embeds: [await makeEmbed(coin)]
                }
            });
        }
    }

    static override async processStringSelect(interaction: APIMessageComponentSelectMenuInteraction, http: FastifyReply): Promise<void> {

        const selected = interaction.data.values[0];
        if (selected == "default") {
            await http.send({
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {content: "Favourite a coin to add it to the list!", flags: MessageFlags.Ephemeral}
            });
            return;
        }

        const coin = await idToApiData(selected);
        analytics.track({
            userId: interaction.user.id,
            event: "Selected a favourite coin",
            properties: {
                coin: coin.symbol
            }
        });
        await http.send({
            type: InteractionResponseType.UpdateMessage, data: {
                components: [await makeButtons(coin, interaction), await makeFavouritesMenu(interaction)],
                embeds: [await makeEmbed(coin)]
            }
        });
    }

    static async getChoiceFromEmbed(message: APIMessage): Promise<CryptoApiData> {
        const pictureUrl = message.embeds[0].thumbnail.url;
        const firstToken = "https://s2.coinmarketcap.com/static/img/coins/128x128/", secondToken = ".png";
        const id = pictureUrl.substring(pictureUrl.indexOf(firstToken) + firstToken.length, pictureUrl.indexOf(secondToken));
        return await idToApiData(id);
    }
}