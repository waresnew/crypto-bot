/* istanbul ignore file */
import InteractionProcessor from "../abstractInteractionProcessor";
import {
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
import {FastifyReply} from "fastify";
import {getEmbedTemplate} from "../templates";
import CryptoStat from "../../structs/cryptoStat";
import {analytics} from "../../utils/analytics";
import {
    makeDirectionPrompt,
    makeGuildDmPrompt,
    makeRolePingPrompt,
    makeStatPrompt,
    makeThresholdPrompt
} from "./interfaceCreator";
import {idToMeta} from "../../structs/coinMetadata";
import {DmCoinAlerts, GuildCoinAlerts} from "../../utils/database";
import {checkAlertCreatePerm, checkCanPingRole, checkChannelSendMsgPerms, commandIds} from "../../utils/discordUtils";
import {validateWhen} from "../../utils/utils";
import {AlertMethod, validateAlert} from "../../utils/alertUtils";
import {UserError} from "../../structs/userError";
import BigNumber from "bignumber.js";
import {GuildCoinAlert} from "../../structs/alert/guildCoinAlert";
import {DmCoinAlert} from "../../structs/alert/dmCoinAlert";

export default class CoinAlertInteractionProcessor extends InteractionProcessor {
    /* istanbul ignore next */
    static override async processModal(interaction: APIModalSubmitInteraction, http: FastifyReply): Promise<void> {
        const split = interaction.data.custom_id.split("_");
        if (interaction.data.custom_id.startsWith("coinalert_thresholdmodal")) {
            let when = interaction.data.components[0].components[0].value;
            if (when.length > 1 && when[0] == "$") {
                when = when.substring(1);
            }
            if (when.length > 1 && when[when.length - 1] == "%") {
                when = when.substring(0, when.length - 1);
            }
            when = when.replaceAll(new RegExp(",", "g"), "");
            try {
                validateWhen(when);
            } catch (e) {
                if (e instanceof UserError) {
                    analytics.track({
                        userId: interaction.user.id,
                        event: "Invalid alert modal input",
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
            const coin = await idToMeta(Number(split[2]));
            const what = split[5];
            const role = split[4];
            const type = split[3] as AlertMethod;
            await http.send(makeDirectionPrompt(interaction, coin, type, role, what, when));
        } else if (interaction.data.custom_id.startsWith("coinalert_msgmodal")) {
            await sendMsgModalReply(interaction, http);
        }
    }

    /* istanbul ignore next */
    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply) {
        const split = interaction.data.custom_id.split("_");
        if (split[1].endsWith("undo")) {
            if (split[1] == "valueundo") {
                const coin = await idToMeta(Number(split[2]));
                const type = split[3] as AlertMethod;
                const role = split[4];
                const res = makeStatPrompt(interaction, coin, type, role);
                await http.send(res);
            } else if (split[1] == "directionundo") {
                const coin = await idToMeta(Number(split[2]));
                const type = split[3] as AlertMethod;
                const role = split[4];
                const what = split[5];
                await http.send(makeThresholdPrompt(interaction, coin, type, role, what));
            } else if (split[1] == "confirmundo") {
                const coin = await idToMeta(Number(split[2]));
                const type = split[3] as AlertMethod;
                const role = split[4];
                const what = split[5];
                const when = split[6];
                await http.send(makeDirectionPrompt(interaction, coin, type, role, what, when));
            } else if (split[1] == "statundo") {
                const coin = await idToMeta(Number(split[2]));
                const type = split[3] as AlertMethod;
                let res;
                if (type == "guild") {
                    res = makeRolePingPrompt(interaction, coin);
                } else {
                    res = makeGuildDmPrompt(interaction, coin);
                }
                res.type = InteractionResponseType.UpdateMessage;
                await http.send(res);
            } else if (split[1] == "roleundo") {
                const coin = await idToMeta(Number(split[2]));
                const res = makeGuildDmPrompt(interaction, coin);
                res.type = InteractionResponseType.UpdateMessage;
                await http.send(res);
            }
            return;
        }
        if (interaction.data.custom_id.startsWith("coinalert_value")) {
            const coin = await idToMeta(Number(split[2]));
            const type = split[3];
            const role = split[4];
            const what = split[5];
            await http.send({
                type: InteractionResponseType.Modal,
                data: {
                    title: `Setting threshold for ${coin.symbol}`,
                    custom_id: `coinalert_thresholdmodal_${coin.cmc_id}_${type}_${role}_${what}`,
                    components: [{
                        type: ComponentType.ActionRow,
                        components: [{
                            type: ComponentType.TextInput,
                            label: "At what threshold should you be alerted?",
                            custom_id: "coinalert_thresholdmodalvalue",
                            style: TextInputStyle.Short,
                            max_length: 18,
                            required: true,
                            placeholder: "Enter a number"
                        }]
                    }]
                }
            } as APIModalInteractionResponse);
        } else if (interaction.data.custom_id.startsWith("coinalert_greater") || interaction.data.custom_id.startsWith("coinalert_less")) {
            const direction = interaction.data.custom_id.startsWith("coinalert_greater") ? ">" : "<";
            const type = split[3] as AlertMethod;
            const what = split[5], when = split[6];
            const role = split[4];
            const coin = await idToMeta(Number(split[2]));
            const message = getEmbedTemplate();
            message.title = `Adding alert for ${coin.name}`;
            message.description = `Great! A message will be sent to ${type == "dm" ? "your **DMs**" : `**this channel** (<#${interaction.channel_id}>)`} when the ${CryptoStat.shortToLong(what)} of ${coin.name} is ${direction == ">" ? "greater than" : "less than"} ${new BigNumber(when).toString()}.

If you want to add a custom message that will be attached with the alert when it triggers, you may click \`Edit message\` to do so. If you wish to remove the message you have set, simply click \`Edit message\` and submit an empty text box.

Otherwise, if you are satisfied, please click \`Confirm\` to activate this alert. Otherwise, click \`Go back\` to go back and make changes.`;
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
                                style: ButtonStyle.Secondary,
                                label: "Go back",
                                custom_id: `coinalert_confirmundo_${coin.cmc_id}_${type}_${role}_${what}_${when}`
                            },
                            {
                                type: ComponentType.Button,
                                emoji: {
                                    name: "📝",
                                    id: null
                                },
                                style: ButtonStyle.Primary,
                                label: "Edit message",
                                custom_id: "coinalert_msg"
                            },
                            {
                                type: ComponentType.Button,
                                custom_id: `coinalert_confirm_${coin.cmc_id}_${type}_${role}_${what}_${when}_${direction}`,
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
        } else if (interaction.data.custom_id.startsWith("coinalert_confirm")) {
            const coin = await idToMeta(Number(split[2]));
            const type = split[3] as AlertMethod;
            const role = split[4];
            const what = split[5];
            const when = split[6];
            const direction = split[7];
            const alert = type == "guild" ? new GuildCoinAlert() : new DmCoinAlert();
            if (!(alert instanceof GuildCoinAlert)) {
                alert.user = interaction.user.id;
            }
            alert.coin = coin.cmc_id;
            alert.stat = what;
            alert.threshold = when;
            alert.direction = direction;
            if (!(alert instanceof DmCoinAlert)) {
                alert.guild = interaction.guild_id;
                alert.channel = interaction.channel_id;
                alert.roleIdPing = role;
            }
            alert.message = interaction.message.embeds[0].fields ?? [].length > 0 ? interaction.message.embeds[0].fields[0].value : null;
            alert.disabled = false;
            const manageAlertLink = type == "dm" ? `</myalerts:${commandIds.get("myalerts")}>` : `</serveralerts:${commandIds.get("serveralerts")}>`;
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
                event: "Alert Created",
                properties: {
                    coin: alert.coin,
                    stat: alert.stat,
                    threshold: alert.threshold,
                    direction: alert.direction,
                    type: type
                }
            });
            if (type == "guild") {
                await GuildCoinAlerts.insertOne(alert as GuildCoinAlert);
            } else {
                await DmCoinAlerts.insertOne(alert as DmCoinAlert);
            }
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    content: `Done! Added and enabled alert for ${coin.name}. Manage your alerts with ${manageAlertLink}.`,
                    flags: MessageFlags.Ephemeral,
                    embeds: [],
                    components: []
                }
            });
        } else if (interaction.data.custom_id.startsWith("coinalert_guild") || interaction.data.custom_id.startsWith("coinalert_dm")) {
            const type = interaction.data.custom_id.startsWith("coinalert_guild") ? "guild" : "dm";
            if (type == "guild" && !interaction.guild_id) {
                analytics.track({
                    userId: interaction.user.id,
                    event: "Tried to create guild alert in DMs",
                    properties: {
                        type: "coin"
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
            const coin = await idToMeta(Number(split[2]));
            let response;
            if (type == "guild") {
                try {
                    checkChannelSendMsgPerms(interaction);
                } catch (e) {
                    if (!(e instanceof UserError)) {
                        throw e;
                    }
                    await http.send({
                        type: InteractionResponseType.ChannelMessageWithSource,
                        data: {
                            content: e.error,
                            flags: MessageFlags.Ephemeral
                        }
                    });
                    return;
                }
                response = makeRolePingPrompt(interaction, coin);
            } else {
                response = makeStatPrompt(interaction, coin, type, null);
            }
            await http.send(response);
        } else if (interaction.data.custom_id.startsWith("coinalert_roleskip")) {
            const coin = await idToMeta(Number(split[2]));
            await http.send(makeStatPrompt(interaction, coin, "guild", null));
        } else if (interaction.data.custom_id.startsWith("coinalert_msg")) {
            await http.send({
                type: InteractionResponseType.Modal,
                data: {
                    title: "Adding custom message",
                    custom_id: "coinalert_msgmodal",
                    components: [{
                        type: ComponentType.ActionRow,
                        components: [{
                            type: ComponentType.TextInput,
                            label: "What message should be attached?",
                            custom_id: "coinalert_msgmodalvalue",
                            style: TextInputStyle.Paragraph,
                            max_length: 250,
                            required: false,
                            placeholder: "Leave this blank to remove the message"
                        }]
                    }]
                }
            } as APIModalInteractionResponse);
        }
    }

    /* istanbul ignore next */
    static override async processSelect(interaction: APIMessageComponentSelectMenuInteraction, http: FastifyReply) {
        const split = interaction.data.custom_id.split("_");
        if (interaction.data.component_type == ComponentType.StringSelect) {
            if (interaction.data.custom_id.startsWith("coinalert_stat")) {
                const coin = await idToMeta(Number(split[2]));
                const type = split[3] as AlertMethod;
                const what = interaction.data.values[0];
                const role = split[4];
                const response = makeThresholdPrompt(interaction, coin, type, role, what);
                await http.send(response);
            }
        } else if (interaction.data.component_type == ComponentType.RoleSelect) {
            if (interaction.data.custom_id.startsWith("coinalert_role")) {
                // noinspection DuplicatedCode
                const data = interaction.data as APIMessageRoleSelectInteractionData;
                const role = data.resolved.roles[Object.keys(data.resolved.roles)[0]];
                try {
                    checkCanPingRole(role, interaction);
                } catch (e) {
                    if (!(e instanceof UserError)) {
                        throw e;
                    }
                    await http.send({
                        type: InteractionResponseType.ChannelMessageWithSource,
                        data: {
                            content: e.error,
                            flags: MessageFlags.Ephemeral
                        }
                    });
                    return;
                }
                const coin = await idToMeta(Number(split[2]));
                await http.send(makeStatPrompt(interaction, coin, "guild", role.id));
            }
        }

    }
}

export async function sendMsgModalReply(interaction: APIModalSubmitInteraction, http: FastifyReply) {
    const msg = interaction.data.components[0].components[0].value;
    if (msg.length > 250) {
        analytics.track({
            userId: interaction.user.id,
            event: "Invalid alert message input",
            properties: {
                input: msg
            }
        });
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource, data: {
                content: "Error: Message is too long (max 250 characters)",
                flags: MessageFlags.Ephemeral
            }
        });
        return;
    }
    const cur = interaction.message;
    if (msg) {
        cur.embeds[0].fields = [{
            name: "Current message",
            value: msg
        }];
    } else if (cur.embeds[0].fields) {
        cur.embeds[0].fields.length = 0;
    }
    await http.send({
        type: InteractionResponseType.UpdateMessage,
        data: {
            embeds: cur.embeds,
            components: cur.components,
            flags: MessageFlags.Ephemeral
        }
    });
}