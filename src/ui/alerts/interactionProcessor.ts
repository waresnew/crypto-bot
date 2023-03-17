/* eslint-disable @typescript-eslint/no-explicit-any */
import InteractionProcessor from "../abstractInteractionProcessor";
import {UserSetting, UserSettingType} from "../../structs/usersettings";
import {db, getCmcCache, idToCrypto} from "../../database";
import {makeAlertsMenu, makeButtons, makeEmbed} from "./interfaceCreator";
import CryptoStat from "../../structs/cryptoStat";
import {
    APIInteraction,
    APIMessageComponentButtonInteraction,
    APIMessageComponentSelectMenuInteraction,
    ComponentType,
    InteractionResponseType,
    MessageFlags,
    TextInputStyle
} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {commandIds} from "../../utils";
import {analytics} from "../../analytics/segment";

export default class AlertsInteractionProcessor extends InteractionProcessor {

    static override async processStringSelect(interaction: APIMessageComponentSelectMenuInteraction, http: FastifyReply) {
        if (interaction.data.custom_id.startsWith("alerts_menu")) {
            if (interaction.data.values[0] == "default") {
                const coinLink = `</coin:${commandIds.get("coin")}>`;
                await http.send({
                    type: InteractionResponseType.ChannelMessageWithSource, data: {
                        content: `Error: You have not added any alerts. Please use ${coinLink} on a coin and then click "Add alert" before proceeding.`,
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }

            const instructions = await makeEmbed(interaction.data.values, interaction);
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    embeds: [instructions],
                    components: [await makeAlertsMenu(interaction), await makeButtons(interaction)],
                    flags: MessageFlags.Ephemeral
                }
            });
        }
    }

    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply) {
        const selected = await AlertsInteractionProcessor.parseSelected(interaction);
        if (selected.length == 0 && !interaction.data.custom_id.match(new RegExp("alerts_refresh"))) {
            analytics.track({
                userId: interaction.user.id,
                event: "Performed batch operation with 0 selected",
                properties: {
                    type: interaction.data.custom_id
                }
            });
            await http.send({
                type: InteractionResponseType.ChannelMessageWithSource, data: {
                    content: "Error: You have not selected any alerts. Please select some alerts before proceeding.",
                    flags: MessageFlags.Ephemeral
                }
            });
            return;
        }
        if (interaction.data.custom_id.startsWith("alerts_enable")) {
            analytics.track({
                userId: interaction.user.id,
                event: "Enabled selected alerts",
                properties: {
                    count: selected.length
                }
            });
            for (const alert of selected) {
                alert.alertDisabled = 0;
                await db.run("update user_settings set alertDisabled=0 where id=? and type=? and alertToken=? and alertStat=? and alertThreshold=? and alertDirection=?", interaction.user.id, UserSettingType[UserSettingType.ALERT], alert.alertToken, alert.alertStat, alert.alertThreshold, alert.alertDirection);
            }
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    embeds: [await makeEmbed(selected, interaction)],
                    components: [await makeAlertsMenu(interaction), await makeButtons(interaction)]
                }
            });
        } else if (interaction.data.custom_id.startsWith("alerts_disable")) {
            analytics.track({
                userId: interaction.user.id,
                event: "Disabled selected alerts",
                properties: {
                    count: selected.length
                }
            });
            for (const alert of selected) {
                alert.alertDisabled = 1;
                await db.run("update user_settings set alertDisabled=1 where id=? and type=? and alertToken=? and alertStat=? and alertThreshold=? and alertDirection=?", interaction.user.id, UserSettingType[UserSettingType.ALERT], alert.alertToken, alert.alertStat, alert.alertThreshold, alert.alertDirection);
            }
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    embeds: [await makeEmbed(selected, interaction)],
                    components: [await makeAlertsMenu(interaction), await makeButtons(interaction)]
                }
            });
        } else if (interaction.data.custom_id.startsWith("alerts_delete")) {
            analytics.track({
                userId: interaction.user.id,
                event: "Deleted selected alerts",
                properties: {
                    count: selected.length
                }
            });
            for (const alert of selected) {
                await db.run("delete from user_settings where id=? and type=? and alertToken=? and alertStat=? and alertThreshold=? and alertDirection=?", interaction.user.id, UserSettingType[UserSettingType.ALERT], alert.alertToken, alert.alertStat, alert.alertThreshold, alert.alertDirection);
            }
            selected.length = 0;
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    embeds: [await makeEmbed(selected, interaction)],
                    components: [await makeAlertsMenu(interaction), await makeButtons(interaction)]
                }
            });
        } else if (interaction.data.custom_id.startsWith("alerts_edit")) {
            if (selected.length != 1) {
                analytics.track({
                    userId: interaction.user.id,
                    event: "Attempted to illegally edit multiple alerts",
                    properties: {
                        count: selected.length
                    }
                });
                await http.send({
                    type: InteractionResponseType.ChannelMessageWithSource, data: {
                        content: "Error: Please select only one alert to edit.",
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }
            const sortedOptions = CryptoStat.listShorts().sort((a, b) => a.length - b.length);
            const coin = await idToCrypto(selected[0].alertToken);
            await http.send({
                type: InteractionResponseType.Modal,
                data: {
                    title: `Editing alert for ${coin.name}`,
                    custom_id: `alerts_editmodal_${interaction.user.id}`,
                    components: [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                {
                                    type: ComponentType.TextInput,
                                    label: "Which stat do you want to track?",
                                    custom_id: `alerts_editmodalstat_${interaction.user.id}`,
                                    style: TextInputStyle.Short,
                                    placeholder: sortedOptions.join(", "),
                                    required: false
                                }
                            ]
                        },
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                {
                                    type: ComponentType.TextInput,
                                    custom_id: `alerts_editmodalvalue_${interaction.user.id}`,
                                    label: "At what threshold should you be alerted?",
                                    style: TextInputStyle.Short,
                                    placeholder: "eg. <-20 for less than -20, >10 for greater than 10",
                                    required: false
                                }
                            ]
                        }
                    ]

                }
            });
        } else if (interaction.data.custom_id.startsWith("alerts_refresh")) {
            analytics.track({
                userId: interaction.user.id,
                event: "Refreshed /alerts page"
            });
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    components: [await makeAlertsMenu(interaction), makeButtons(interaction)],
                    embeds: [await makeEmbed(selected, interaction)],
                    flags: MessageFlags.Ephemeral
                }
            });
        }

    }

    static async parseSelected(interaction: APIInteraction) {
        const selected: UserSetting[] = [];
        for (const line of interaction.message.embeds[0].description.split("\n")) {
            const input = line.match(new RegExp(/- ([❌✅]) When (.+) of (.+) is (less|greater) than (.+)/));
            if (!input) {
                continue;
            }
            const setting = new UserSetting();
            setting.id = interaction.user.id;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            setting.alertStat = CryptoStat.longToShort(CryptoStat.listLongs().find(k => k == input[2].toLowerCase()));
            setting.alertToken = (await getCmcCache("select id from cmc_cache where name=?", input[3])).id;
            setting.alertThreshold = Number(input[5].replace(new RegExp(/[$%]/), ""));
            setting.alertDirection = input[4] == "less" ? "<" : ">";
            setting.alertDisabled = input[1] == "❌" ? 1 : 0;
            setting.type = UserSettingType[UserSettingType.ALERT];
            selected.push(setting);
        }
        return selected;
    }
}