import InteractionProcessor from "../abstractInteractionProcessor";
import {
    APIInteractionResponse,
    APIMessageComponentButtonInteraction,
    APIMessageComponentSelectMenuInteraction,
    APIModalInteractionResponse,
    APIModalSubmitInteraction,
    ButtonStyle,
    ComponentType,
    InteractionResponseType,
    MessageFlags,
    TextInputStyle
} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {db, genSqlInsertCommand, idToCrypto} from "../../database";
import {getEmbedTemplate} from "../templates";
import CryptoStat from "../../structs/cryptoStat";
import {analytics} from "../../analytics/segment";
import {UserSetting, UserSettingType} from "../../structs/usersettings";
import {commandIds} from "../../utils";

export default class AlertWizardInteractionProcessor extends InteractionProcessor {
    static validateWhen(when: string) {
        if (!when) {
            throw "Error: You did not specify a threshold. Please try again.";
        }
        if (when.length > 12) {
            throw "Error: The threshold you specified was too long. Please note that we only support thresholds from negative one billion to positive one billion.";
        }
        if (isNaN(Number(when)) || isNaN(parseFloat(when))) {
            throw "Error: The specified threshold was not a number. Make sure to remove percent and dollar signs from your input.";
        }
        if (Math.abs(Number(when)) > 1000000000) {
            throw "Error: The threshold you specified was too high. Please ensure it is between negative one billion and positive one billion.";
        }
    }

    static override async processModal(interaction: APIModalSubmitInteraction, http: FastifyReply): Promise<void> {
        if (interaction.data.custom_id.startsWith("alertwizard_alertthresholdmodal")) {
            const when = interaction.data.components[0].components[0].value;
            try {
                this.validateWhen(when);
            } catch (e) {
                analytics.track({
                    userId: interaction.user.id,
                    event: "Invalid alert modal input",
                    properties: {
                        type: "threshold",
                        input: when
                    }
                });
                await http.send({
                    type: InteractionResponseType.UpdateMessage, data: {
                        content: e,
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }
            const coin = await idToCrypto(interaction.data.custom_id.split("_")[2]);
            const what = interaction.data.custom_id.split("_")[3];
            const message = getEmbedTemplate();
            message.title = `Adding alert for ${coin.name}`;
            message.description = `Great! Now, do you want to be alerted when the ${CryptoStat.shortToLong(what)} of ${coin.name} is above or below ${when}?`;
            await http.send({
                type: InteractionResponseType.UpdateMessage,
                flags: MessageFlags.Ephemeral,
                data: {
                    embeds: [message],
                    components: [{
                        type: ComponentType.ActionRow,
                        components: [
                            {
                                type: ComponentType.Button,
                                custom_id: `alertwizard_alertDirectionGreater_${coin.id}_${what}_${when}_${interaction.user.id}`,
                                label: "Greater than",
                                style: ButtonStyle.Success,
                                emoji: {
                                    name: "📈",
                                    id: null
                                }
                            },
                            {
                                type: ComponentType.Button,
                                custom_id: `alertwizard_alertDirectionLess_${coin.id}_${what}_${when}_${interaction.user.id}`,
                                label: "Less than",
                                style: ButtonStyle.Danger,
                                emoji: {
                                    name: "📉",
                                    id: null
                                }
                            }
                        ]
                    }]
                }
            });
        }
    }

    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply) {
        if (interaction.data.custom_id.startsWith("alertwizard_alertvalue")) {
            const coin = await idToCrypto(interaction.data.custom_id.split("_")[2]);
            const what = interaction.data.custom_id.split("_")[3];
            http.send({
                type: InteractionResponseType.Modal,
                data: {
                    title: `Setting threshold for ${CryptoStat.shortToLong(what)}`,
                    custom_id: `alertwizard_alertthresholdmodal_${coin.id}_${what}_${interaction.user.id}`,
                    components: [{
                        type: ComponentType.ActionRow,
                        components: [{
                            type: ComponentType.TextInput,
                            label: "At what threshold should you be alerted?",
                            custom_id: `alertwizard_alertthresholdmodalvalue_${interaction.user.id}`,
                            style: TextInputStyle.Short,
                            required: true,
                            placeholder: "Enter a raw number"
                        }]
                    }]
                }
            } as APIModalInteractionResponse);
        } else if (interaction.data.custom_id.startsWith("alertwizard_alertDirection")) {
            const direction = interaction.data.custom_id.startsWith("alertwizard_alertDirectionGreater") ? ">" : "<";
            const what = interaction.data.custom_id.split("_")[3], when = interaction.data.custom_id.split("_")[4];
            const coin = await idToCrypto(interaction.data.custom_id.split("_")[2]);
            const alert = new UserSetting();
            alert.id = interaction.user.id;
            alert.type = UserSettingType[UserSettingType.ALERT];
            alert.alertToken = coin.id;
            alert.alertStat = what;
            alert.alertThreshold = Number(when);
            alert.alertDirection = direction;
            const manageAlertLink = `</alerts:${commandIds.get("alerts")}>`;
            if ((await db.get("select count(id) from user_settings where id=? and type=?", alert.id, alert.type))["count(id)"] >= 25) {
                //limit to 25 bc stringselectmenus hax a max of 25 entries
                analytics.track({
                    userId: interaction.user.id,
                    event: "Alert Creation Failed",
                    properties: {
                        reason: "Too many alerts"
                    }
                });
                await http.send({
                    type: InteractionResponseType.UpdateMessage, data: {
                        content: `Error: You can not have more than 25 alerts set. Please delete one before proceeding. ${manageAlertLink}`,
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }
            if (Object.values(await db.get("select exists(select 1 from user_settings where id=? and type=? and alertToken=? and alertStat=? and alertThreshold=? and alertDirection=?)", interaction.user.id, UserSettingType[UserSettingType.ALERT], alert.alertToken, alert.alertStat, alert.alertThreshold, alert.alertDirection))[0]) {
                analytics.track({
                    userId: interaction.user.id,
                    event: "Alert Creation Failed",
                    properties: {
                        reason: "Duplicate alert"
                    }
                });
                await http.send({
                    type: InteractionResponseType.UpdateMessage, data: {
                        content: `Error: You already have an alert exactly like the one you are trying to add. Please delete it before proceeding. ${manageAlertLink}`,
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }
            analytics.track({
                userId: interaction.user.id,
                event: "Alert Created",
                properties: {
                    coin: alert.alertToken,
                    stat: alert.alertStat,
                    threshold: alert.alertThreshold,
                    direction: alert.alertDirection
                }
            });
            await genSqlInsertCommand(alert, "user_settings", new UserSetting());
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    content: `Done! Added and enabled alert for ${coin.name}. Manage your alerts with ${manageAlertLink}`,
                    flags: MessageFlags.Ephemeral
                }
            });
        }
    }

    static override async processStringSelect(interaction: APIMessageComponentSelectMenuInteraction, http: FastifyReply) {
        if (interaction.data.custom_id.startsWith("alertwizard_alertstat")) {
            const coin = await idToCrypto(interaction.data.custom_id.split("_")[2]);
            const what = interaction.data.values[0];
            const message = getEmbedTemplate();
            message.title = `Adding alert for ${coin.name}`;
            message.description = `Great! You're now tracking the ${CryptoStat.shortToLong(what)} of ${coin.name}. At what threshold would you like to be alerted?`;
            const response = {
                type: InteractionResponseType.UpdateMessage, data: {
                    embeds: [message],
                    flags: MessageFlags.Ephemeral,
                    components: [{
                        type: ComponentType.ActionRow,
                        components: [{
                            type: ComponentType.Button,
                            emoji: {
                                name: "🔢",
                                id: null
                            },
                            style: ButtonStyle.Primary,
                            label: "Set threshold",
                            custom_id: `alertwizard_alertvalue_${coin.id}_${what}_${interaction.user.id}`
                        }]
                    }]
                }
            } as APIInteractionResponse;
            await http.send(response);
        }
    }
}