/* istanbul ignore file */
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
import {getEmbedTemplate} from "../templates";
import CryptoStat from "../../structs/cryptoStat";
import {analytics} from "../../utils/analytics";
import {makeDirectionPrompt, makeGuildDmPrompt, makeStatPrompt, makeThresholdPrompt} from "./interfaceCreator";
import {idToMeta} from "../../structs/coinMetadata";
import {CoinAlert} from "../../structs/alert/coinAlert";
import {CoinAlerts} from "../../utils/database";
import {commandIds} from "../../utils/discordUtils";
import {validateWhen} from "../../utils/utils";
import {AlertType, validateAlert} from "../../utils/alertUtils";
import {UserError} from "../../structs/userError";
import BigNumber from "bignumber.js";

export default class CoinAlertInteractionProcessor extends InteractionProcessor {
//todo branching the group alerts from dm alerts shouldn't be that hard
// and i can proabbly abstract the beginning alert flow (group/dm, which channel)
// by making a function with "coinalert" or "gasalert" arg and prefix my customids with that
    /* istanbul ignore next */
    static override async processModal(interaction: APIModalSubmitInteraction, http: FastifyReply): Promise<void> {
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
            const coin = idToMeta(Number(interaction.data.custom_id.split("_")[2]));
            const what = interaction.data.custom_id.split("_")[4];
            const type = interaction.data.custom_id.split("_")[3] as AlertType;
            await http.send(makeDirectionPrompt(interaction, coin, type, what, when));
        }
    }

    /* istanbul ignore next */
    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply) {
        if (interaction.data.custom_id.split("_")[1].endsWith("undo")) {
            const split = interaction.data.custom_id.split("_");
            if (split[1] == "valueundo") {
                const coin = idToMeta(Number(split[2]));
                const type = split[3] as AlertType;
                const res = makeStatPrompt(interaction, coin, type);
                res.type = InteractionResponseType.UpdateMessage;
                await http.send(res);
            } else if (split[1] == "directionundo") {
                const coin = idToMeta(Number(split[2]));
                const type = split[3] as AlertType;
                const what = split[4];
                await http.send(makeThresholdPrompt(interaction, coin, type, what));
            } else if (split[1] == "confirmundo") {
                const coin = idToMeta(Number(split[2]));
                const type = split[3] as AlertType;
                const what = split[4];
                const when = split[5];
                await http.send(makeDirectionPrompt(interaction, coin, type, what, when));
            } else if (split[1] == "statundo") {
                const coin = idToMeta(Number(split[2]));
                await http.send(makeGuildDmPrompt(interaction, coin));
            }
            return;
        }
        if (interaction.data.custom_id.startsWith("coinalert_value")) {
            const coin = idToMeta(Number(interaction.data.custom_id.split("_")[2]));
            const type = interaction.data.custom_id.split("_")[3];
            const what = interaction.data.custom_id.split("_")[4];
            await http.send({
                type: InteractionResponseType.Modal,
                data: {
                    title: `Setting threshold for ${coin.symbol}`,
                    custom_id: `coinalert_thresholdmodal_${coin.cmc_id}_${type}_${what}`,
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
        } else if (interaction.data.custom_id.startsWith("coinalert_direction")) {
            const direction = interaction.data.custom_id.startsWith("coinalert_directiongreater") ? ">" : "<";
            const type = interaction.data.custom_id.split("_")[3] as AlertType;
            const what = interaction.data.custom_id.split("_")[4], when = interaction.data.custom_id.split("_")[5];
            const coin = idToMeta(Number(interaction.data.custom_id.split("_")[2]));
            const message = getEmbedTemplate();
            message.title = `Adding alert for ${coin.name}`;
            message.description = `Great! You will be **DM'ed** when the ${CryptoStat.shortToLong(what)} of ${coin.name} is ${direction == ">" ? "greater than" : "less than"} ${new BigNumber(when).toString()}. If you are satisfied, please click \`Confirm\` to activate this alert. Otherwise, click \`Go back\` to go back and make changes.`;
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
                                custom_id: `coinalert_confirmundo_${coin.cmc_id}_${type}_${what}_${when}`
                            },
                            {
                                type: ComponentType.Button,
                                custom_id: `coinalert_confirm_${coin.cmc_id}_${type}_${what}_${when}_${direction}`,
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
            const coin = idToMeta(Number(interaction.data.custom_id.split("_")[2]));
            const type = interaction.data.custom_id.split("_")[3] as AlertType;
            const what = interaction.data.custom_id.split("_")[4];
            const when = interaction.data.custom_id.split("_")[5];
            const direction = interaction.data.custom_id.split("_")[6];
            const alert = new CoinAlert();
            alert.user = type == "dm" ? interaction.user.id : null;
            alert.coin = coin.cmc_id;
            alert.stat = what;
            alert.threshold = when;
            alert.direction = direction;
            alert.guild = type == "guild" ? interaction.guild_id : null;
            alert.disabled = false;
            const manageAlertLink = `</myalerts:${commandIds.get("myalerts")}>`;
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
            await CoinAlerts.insertOne(alert);
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    content: `Done! Added and enabled alert for ${coin.name}. Manage your alerts with ${manageAlertLink}. Please make sure you stay in a server with Botchain in it, so it can DM you when your alert triggers.`,
                    flags: MessageFlags.Ephemeral,
                    embeds: [],
                    components: []
                }
            });
        } else if (interaction.data.custom_id.startsWith("coinalert_guild") || interaction.data.custom_id.startsWith("coinalert_dm")) {
            const type = interaction.data.custom_id.startsWith("coinalert_guild") ? "guild" : "dm";
            const coin = idToMeta(Number(interaction.data.custom_id.split("_")[2]));
            const response = makeStatPrompt(interaction, coin, type);
            await http.send(response);
        }
    }

    /* istanbul ignore next */
    static override async processStringSelect(interaction: APIMessageComponentSelectMenuInteraction, http: FastifyReply) {

        if (interaction.data.custom_id.startsWith("coinalert_stat")) {
            const coin = idToMeta(Number(interaction.data.custom_id.split("_")[2]));
            const type = interaction.data.custom_id.split("_")[3] as AlertType;
            const what = interaction.data.values[0];
            const response = makeThresholdPrompt(interaction, coin, type, what);
            await http.send(response);
        }
    }
}