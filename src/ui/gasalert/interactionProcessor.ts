/* istanbul ignore file */
import InteractionProcessor from "../abstractInteractionProcessor";
import {FastifyReply} from "fastify";
import {
    APIMessageChannelSelectInteractionData,
    APIMessageComponentButtonInteraction,
    APIMessageComponentSelectMenuInteraction,
    APIMessageRoleSelectInteractionData,
    APIModalInteractionResponse,
    APIModalSubmitInteraction,
    ButtonStyle,
    ComponentType,
    InteractionResponseType,
    MessageFlags,
    TextInputStyle
} from "discord-api-types/v10";
import {
    makeChannelPrompt,
    makeGuildDmPrompt,
    makeRolePingPrompt,
    makeSpeedPrompt,
    makeThresholdPrompt
} from "./interfaceCreator";
import {validateWhen} from "../../utils/utils";
import {analytics} from "../../utils/analytics";
import {getEmbedTemplate} from "../templates";
import {AlertMethod, validateAlert} from "../../utils/alertUtils";
import {DmGasAlerts, GuildGasAlerts} from "../../utils/database";
import {checkAlertCreatePerm, commandIds} from "../../utils/discordUtils";
import {UserError} from "../../structs/userError";
import {GuildGasAlert} from "../../structs/alert/guildGasAlert";
import {DmGasAlert} from "../../structs/alert/dmGasAlert";
import {sendMsgModalReply} from "../coinalert/interactionProcessor";

export default class GasAlertInteractionProcessor extends InteractionProcessor {
    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply): Promise<void> {
        if (interaction.data.custom_id.split("_")[1].endsWith("undo")) {
            const split = interaction.data.custom_id.split("_");
            if (split[1] == "thresholdundo") {
                const alertMethod = split[2] as AlertMethod;
                const channel = split[3];
                const role = split[4];
                const res = makeSpeedPrompt(alertMethod, channel, role);
                res.type = InteractionResponseType.UpdateMessage;
                await http.send(res);
            } else if (split[1] == "confirmundo") {
                const alertMethod = split[2] as AlertMethod;
                const channel = split[3];
                const role = split[4];
                const speed = split[5];
                await http.send(makeThresholdPrompt(alertMethod, channel, role, speed));
            } else if (split[1] == "channelundo") {
                await http.send(makeGuildDmPrompt());
            } else if (split[1] == "speedundo") {
                const type = split[2] as AlertMethod;
                const channel = split[3];
                let res;
                if (type == "guild") {
                    res = makeRolePingPrompt(channel);
                } else {
                    res = makeGuildDmPrompt();
                }
                res.type = InteractionResponseType.UpdateMessage;
                await http.send(res);
            } else if (split[1] == "roleundo") {
                const res = makeChannelPrompt();
                res.type = InteractionResponseType.UpdateMessage;
                await http.send(res);
            }
        }
        if (interaction.data.custom_id.startsWith("gasalert_speed")) {
            const speed = interaction.data.custom_id.split("_")[1].substring("speed".length);
            const alertMethod = interaction.data.custom_id.split("_")[2] as AlertMethod;
            const channel = interaction.data.custom_id.split("_")[3];
            const role = interaction.data.custom_id.split("_")[4];
            await http.send(makeThresholdPrompt(alertMethod, channel, role, speed));
        } else if (interaction.data.custom_id.startsWith("gasalert_threshold")) {
            const split = interaction.data.custom_id.split("_");
            const alertMethod = split[2];
            const channel = split[3];
            const role = split[4];
            const speed = split[5];
            await http.send({
                type: InteractionResponseType.Modal,
                data: {
                    title: `Setting threshold for ${speed} gas price`,
                    custom_id: `gasalert_thresholdmodal_${alertMethod}_${channel}_${role}_${speed}`,
                    components: [{
                        type: ComponentType.ActionRow,
                        components: [{
                            type: ComponentType.TextInput,
                            label: "At what threshold should you be alerted?",
                            custom_id: "gasalert_thresholdmodalvalue",
                            style: TextInputStyle.Short,
                            required: true,
                            max_length: 18,
                            placeholder: "Enter a number"
                        }]
                    }]
                }
            } as APIModalInteractionResponse);
        } else if (interaction.data.custom_id.startsWith("gasalert_confirm")) {
            const split = interaction.data.custom_id.split("_");
            const alertMethod = split[2] as AlertMethod;
            const channel = split[3];
            const role = split[4];
            const speed = split[5];
            const threshold = split[6];
            const alert = alertMethod == "guild" ? new GuildGasAlert() : new DmGasAlert();
            if (alert instanceof GuildGasAlert) {
                alert.channel = channel;
                alert.roleIdPing = role;
                alert.guild = interaction.guild_id;
            } else {
                alert.user = interaction.user.id;
            }
            alert.speed = speed;
            alert.threshold = threshold;
            alert.disabled = false;
            alert.message = interaction.message.embeds[0].fields ?? [].length > 0 ? interaction.message.embeds[0].fields[0].value : null;
            try {
                await validateAlert(alert);
            } catch (e) {
                if (e instanceof UserError) {
                    await http.send({
                        type: InteractionResponseType.ChannelMessageWithSource, data: {
                            content: e.error,
                            flags: MessageFlags.Ephemeral
                        }
                    });
                    return;
                } else {
                    throw e;
                }
            }
            analytics.track({
                userId: interaction.user.id,
                event: "Gas Alert Created",
                properties: {
                    speed: alert.speed,
                    threshold: alert.threshold,
                    type: alertMethod
                }
            });
            const manageAlertLink = alertMethod == "dm" ? `</myalerts:${commandIds.get("myalerts")}>` : `</serveralerts:${commandIds.get("serveralerts")}>`;

            if (alertMethod == "guild") {
                await GuildGasAlerts.insertOne(alert as GuildGasAlert);
            } else {
                await DmGasAlerts.insertOne(alert as DmGasAlert);
            }
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    content: `Done! Added and enabled alert. Manage your alerts with ${manageAlertLink}. ` + (alertMethod == "guild" ? "Please ensure Botchain has permissions to send messages in the channel you specified." : "Please make sure you stay in a server with Botchain in it, so it can DM you when your alert triggers."),
                    flags: MessageFlags.Ephemeral,
                    embeds: [],
                    components: []
                }
            });
        } else if (interaction.data.custom_id.startsWith("gasalert_guild") || interaction.data.custom_id.startsWith("gasalert_dm")) {
            const type = interaction.data.custom_id.startsWith("gasalert_guild") ? "guild" : "dm";
            if (type == "guild" && !interaction.guild_id) {
                analytics.track({
                    userId: interaction.user.id,
                    event: "Tried to create guild alert in DMs",
                    properties: {
                        type: "gas"
                    }
                });
                await http.send({
                    type: InteractionResponseType.ChannelMessageWithSource, data: {
                        content: "Error: You must be in a server to set up a guild alert.",
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }
            if (type == "guild") {
                try {
                    await checkAlertCreatePerm(interaction);
                } catch (e) {
                    if (e instanceof UserError) {
                        await http.send({
                            type: InteractionResponseType.ChannelMessageWithSource,
                            data: {
                                content: e.error,
                                flags: MessageFlags.Ephemeral
                            }
                        });
                    } else {
                        throw e;
                    }
                }
            }
            let response;
            if (type == "guild") {
                response = makeChannelPrompt();
            } else {
                response = makeSpeedPrompt(type, null, null);
            }
            await http.send(response);
        } else if (interaction.data.custom_id.startsWith("gasalert_msg")) {
            await http.send({
                type: InteractionResponseType.Modal,
                data: {
                    title: "Adding custom message",
                    custom_id: "gasalert_msgmodal",
                    components: [{
                        type: ComponentType.ActionRow,
                        components: [{
                            type: ComponentType.TextInput,
                            label: "What message should be attached?",
                            custom_id: "gasalert_msgmodalvalue",
                            style: TextInputStyle.Paragraph,
                            max_length: 250,
                            required: false,
                            placeholder: "Leave this blank to remove the message"
                        }]
                    }]
                }
            } as APIModalInteractionResponse);
        } else if (interaction.data.custom_id.startsWith("gasalert_roleskip")) {
            const channel = interaction.data.custom_id.split("_")[2];
            await http.send(makeSpeedPrompt("guild", channel, null));
        }
    }

    static override async processModal(interaction: APIModalSubmitInteraction, http: FastifyReply): Promise<void> {
        const split = interaction.data.custom_id.split("_");
        if (interaction.data.custom_id.startsWith("gasalert_thresholdmodal")) {
            let when = interaction.data.components[0].components[0].value;
            if (when.endsWith("gwei")) {
                when = when.replace("gwei", "").trim();
            }
            try {
                validateWhen(when);
            } catch (e) {
                if (e instanceof UserError) {
                    analytics.track({
                        userId: interaction.user.id,
                        event: "Invalid gas modal input",
                        properties: {
                            type: "threshold",
                            input: when
                        }
                    });
                    await http.send({
                        type: InteractionResponseType.ChannelMessageWithSource, data: {
                            content: e.error,
                            flags: MessageFlags.Ephemeral
                        }
                    });
                    return;
                } else {
                    throw e;
                }
            }
            const alertMethod = split[2] as AlertMethod;
            const channel = split[3];
            const role = split[4];
            const speed = split[5];
            await http.send({
                type: InteractionResponseType.UpdateMessage,
                data: {
                    flags: MessageFlags.Ephemeral,
                    embeds: [
                        {
                            ...getEmbedTemplate(),
                            title: "Adding alert for Ethereum Gas Prices",
                            description: `Great! You will be **DM'ed** when the gas fee for a ${speed} transaction is less than ${when}.
If you want to add a custom message that will be attached with the alert when it triggers, you may click \`Edit message\` to do so. If you wish to remove the message you have set, simply click \`Edit message\` and submit an empty text box.

Otherwise, if you are satisfied, please click \`Confirm\` to activate this alert. Otherwise, click \`Go back\` to go back and make changes.`
                        }
                    ],
                    components: [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                {
                                    type: ComponentType.Button,
                                    label: "Go back",
                                    emoji: {
                                        name: "⬅️",
                                        id: null
                                    },
                                    style: ButtonStyle.Secondary,
                                    custom_id: `gasalert_confirmundo_${alertMethod}_${channel}_${role}_${speed}`
                                },
                                {
                                    type: ComponentType.Button,
                                    emoji: {
                                        name: "📝",
                                        id: null
                                    },
                                    style: ButtonStyle.Primary,
                                    label: "Edit message",
                                    custom_id: "gasalert_msg"
                                },
                                {
                                    type: ComponentType.Button,
                                    label: "Confirm",
                                    emoji: {
                                        name: "✅",
                                        id: null
                                    },
                                    style: ButtonStyle.Success,
                                    custom_id: `gasalert_confirm_${alertMethod}_${channel}_${role}_${speed}_${when}`
                                }
                            ]
                        }
                    ]
                }
            });
        } else if (interaction.data.custom_id.startsWith("gasalert_msgmodal")) {
            await sendMsgModalReply(interaction, http);
        }
    }

    static override async processSelect(interaction: APIMessageComponentSelectMenuInteraction, http: FastifyReply) {
        const split = interaction.data.custom_id.split("_");
        if (interaction.data.component_type == ComponentType.ChannelSelect) {
            if (interaction.data.custom_id.startsWith("gasalert_channel")) {
                const data = interaction.data as APIMessageChannelSelectInteractionData;
                const channel = data.resolved.channels[Object.keys(data.resolved.channels)[0]].id;
                await http.send(makeRolePingPrompt(channel));
            }
        } else if (interaction.data.component_type == ComponentType.RoleSelect) {
            if (interaction.data.custom_id.startsWith("gasalert_role")) {
                const data = interaction.data as APIMessageRoleSelectInteractionData;
                const role = data.resolved.roles[Object.keys(data.resolved.roles)[0]].id;
                const channel = split[2];
                await http.send(makeSpeedPrompt("guild", channel, role));
            }
        }
    }
}