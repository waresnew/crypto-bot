import InteractionProcessor from "../abstractInteractionProcessor";
import {
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
import {makeDirectionPrompt, makeStatPrompt, makeThresholdPrompt} from "./interfaceCreator";

export default class AlertWizardInteractionProcessor extends InteractionProcessor {
    static validateWhen(when: string) {
        if (!when) {
            throw "Error: You did not specify a threshold. Please try again.";
        }
        if (when.length > 9) {
            throw "Error: The threshold you specified was too long. Please note that we only support thresholds from negative one billion to positive one billion.";
        }
        if (isNaN(Number(when)) || isNaN(parseFloat(when))) {
            throw "Error: The specified threshold was not a number.";
        }
        if (Math.abs(Number(when)) > 1000000000) {
            throw "Error: The threshold you specified was too high. Please ensure it is between negative one billion and positive one billion.";
        }
    }

    static override async processModal(interaction: APIModalSubmitInteraction, http: FastifyReply): Promise<void> {
        if (interaction.data.custom_id.startsWith("alertwizard_alertthresholdmodal")) {
            let when = interaction.data.components[0].components[0].value;
            if (when.length > 1 && when[0] == "$") {
                when = when.substring(1);
            }
            if (when.length > 1 && when[when.length - 1] == "%") {
                when = when.substring(0, when.length - 1);
            }
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
            await http.send(makeDirectionPrompt(interaction, coin, what, when));
        }
    }

    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply) {
        if (interaction.data.custom_id.split("_")[1].endsWith("undo")) {
            const split = interaction.data.custom_id.split("_");
            if (split[1] == "alertvalueundo") {
                const coin = await idToCrypto(split[2]);
                const res = makeStatPrompt(interaction, coin);
                res.type = InteractionResponseType.UpdateMessage;
                await http.send(res);
            } else if (split[1] == "alertdirectionundo") {
                const coin = await idToCrypto(split[2]);
                const what = split[3];
                await http.send(makeThresholdPrompt(interaction, coin, what));
            } else if (split[1] == "confirmundo") {
                const coin = await idToCrypto(split[2]);
                const what = split[3];
                const when = split[4];
                await http.send(makeDirectionPrompt(interaction, coin, what, when));
            }
            return;
        }
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
                            placeholder: "Enter a number"
                        }]
                    }]
                }
            } as APIModalInteractionResponse);
        } else if (interaction.data.custom_id.startsWith("alertwizard_alertdirection")) {
            const direction = interaction.data.custom_id.startsWith("alertwizard_alertdirectiongreater") ? ">" : "<";
            const what = interaction.data.custom_id.split("_")[3], when = interaction.data.custom_id.split("_")[4];
            const coin = await idToCrypto(interaction.data.custom_id.split("_")[2]);
            const message = getEmbedTemplate();
            message.title = `Adding alert for ${coin.name}`;
            message.description = `Great! You will be alerted when the ${CryptoStat.shortToLong(what)} of ${coin.name} is ${direction == ">" ? "greater than" : "less than"} ${when}. If you are satisfied, please click \`Confirm\` to activate this alert. Otherwise, click \`Go back\` to go back and make changes.`;
            await http.send({
                type: InteractionResponseType.UpdateMessage,
                data: {
                    embeds: [message],
                    flags: MessageFlags.Ephemeral,
                    components: [{
                        type: ComponentType.ActionRow,
                        components: [
                            {
                                type: ComponentType.Button,
                                emoji: {
                                    name: "⬅️",
                                    id: null
                                },
                                style: ButtonStyle.Primary,
                                label: "Go back",
                                custom_id: `alertwizard_confirmundo_${coin.id}_${what}_${when}_${interaction.user.id}`
                            },
                            {
                                type: ComponentType.Button,
                                custom_id: `alertwizard_confirm_${coin.id}_${what}_${when}_${direction}_${interaction.user.id}`,
                                label: "Confirm",
                                style: ButtonStyle.Success,
                                emoji: {
                                    name: "✅",
                                    id: null
                                }
                            }
                        ]
                    }]
                }
            });
        } else if (interaction.data.custom_id.startsWith("alertwizard_confirm")) {
            const coin = await idToCrypto(interaction.data.custom_id.split("_")[2]);
            const what = interaction.data.custom_id.split("_")[3];
            const when = interaction.data.custom_id.split("_")[4];
            const direction = interaction.data.custom_id.split("_")[5];
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
                        flags: MessageFlags.Ephemeral,
                        embeds: [],
                        components: []
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
                        flags: MessageFlags.Ephemeral,
                        embeds: [],
                        components: []
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
                    flags: MessageFlags.Ephemeral,
                    embeds: [],
                    components: []
                }
            });
        }
    }

    static override async processStringSelect(interaction: APIMessageComponentSelectMenuInteraction, http: FastifyReply) {
        if (interaction.data.custom_id.startsWith("alertwizard_alertstat")) {
            const coin = await idToCrypto(interaction.data.custom_id.split("_")[2]);
            const what = interaction.data.values[0];
            const response = makeThresholdPrompt(interaction, coin, what);
            await http.send(response);
        }
    }
}