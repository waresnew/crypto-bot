import {db, genSqlInsertCommand, idToCrypto} from "../../database";
import {UserSetting, UserSettingType} from "../../structs/usersettings";
import InteractionProcessor from "../abstractInteractionProcessor";
import {makeButtons, makeEmbed, makeFavouritesMenu} from "./interfaceCreator";
import CryptoStat from "../../structs/cryptoStat";
import {
    APIButtonComponentWithCustomId,
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
    static validateWhat(what: string) {
        if (!what) {
            throw "Error: You did not specify a stat or a threshold. Please try again.";
        }
        if (!CryptoStat.listShorts().includes(what)) {
            throw "Error: The specified stat was invalid. Make sure to specify the exact string provided in the example. Please enter one of the following exactly: `" + CryptoStat.listShorts().join("`, `") + "`.";
        }
    }

    static validateWhen(when: string) {
        if (when.charAt(0) != "<" && when.charAt(0) != ">") {
            throw "Error: The specified threshold did not have a `<` or `>` sign in front of it. Please use `<` if you want to be alerted when the value is below your threshold, and `>` if you want to know when the value is above. For example, entering `>20` will mean you will be alerted when the value is above 20.";
        }
        if (when.length > 12) {
            throw "Error: The threshold you specified was too long. Please note that we only support thresholds from negative one billion to positive one billion.";
        }
        if (isNaN(Number(when.substring(1))) || isNaN(parseFloat(when.substring(1)))) {
            throw "Error: The specified threshold was not a number. Make sure to remove percent and dollar signs from your input. For example, entering `>20` will mean you will be alerted when the value is above 20.";
        }
        if (Math.abs(Number(when.substring(1))) > 1000000000) {
            throw "Error: The threshold you specified was too high. Please ensure it is between negative one billion and positive one billion.";
        }
    }

    static override async processModal(interaction: APIModalSubmitInteraction, http: FastifyReply): Promise<void> {
        if (interaction.data.custom_id.startsWith("coin_alertsmodal")) {
            const coin = await idToCrypto(interaction.data.custom_id.split("_")[2]);
            const what = interaction.data.components.find(entry => entry.components[0].custom_id == `coin_alertsmodalstat_${interaction.user.id}`).components[0].value.toLowerCase();
            const when = interaction.data.components.find(entry => entry.components[0].custom_id == `coin_alertsmodalvalue_${interaction.user.id}`).components[0].value;
            try {
                this.validateWhat(what);
            } catch (e) {
                analytics.track({
                    userId: interaction.user.id,
                    event: "Invalid alert modal input",
                    properties: {
                        type: "what",
                        input: what
                    }
                });
                await http.send({
                    type: InteractionResponseType.ChannelMessageWithSource, data: {
                        content: e,
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }
            try {
                this.validateWhen(when);
            } catch (e) {
                analytics.track({
                    userId: interaction.user.id,
                    event: "Invalid alert modal input",
                    properties: {
                        type: "when",
                        input: when
                    }
                });
                await http.send({
                    type: InteractionResponseType.ChannelMessageWithSource, data: {
                        content: e,
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
        const coin = await idToCrypto(interaction.data.custom_id.split("_")[2]);
        if (interaction.data.custom_id.startsWith("coin_alerts")) {
            const sortedOptions = CryptoStat.listShorts().sort((a, b) => a.length - b.length);
            const modal: APIModalInteractionResponseCallbackData = {
                custom_id: `coin_alertsmodal_${coin.id}_${interaction.user.id}`,
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
                    components: [await makeButtons(await idToCrypto(interaction.data.custom_id.split("_")[2]), interaction), await makeFavouritesMenu(interaction)],
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

        const coin = await idToCrypto(selected);
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
}