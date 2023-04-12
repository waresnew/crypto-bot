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
import {makeDirectionPrompt, makeStatPrompt, makeThresholdPrompt} from "./interfaceCreator";
import {idToMeta} from "../../structs/coinMetadata";
import {CoinAlert} from "../../structs/alert/coinAlert";
import {CoinAlerts} from "../../utils/database";
import {commandIds} from "../../utils/discordUtils";
import {validateWhen} from "../../utils/utils";
import {validateAlert} from "../../utils/alertUtils";

export default class CoinAlertInteractionProcessor extends InteractionProcessor {

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
            try {
                validateWhen(when);
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
            const coin = idToMeta(Number(interaction.data.custom_id.split("_")[2]));
            const what = interaction.data.custom_id.split("_")[3];
            await http.send(makeDirectionPrompt(interaction, coin, what, when));
        }
    }

    /* istanbul ignore next */
    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply) {
        if (interaction.data.custom_id.split("_")[1].endsWith("undo")) {
            const split = interaction.data.custom_id.split("_");
            if (split[1] == "valueundo") {
                const coin = idToMeta(Number(split[2]));
                const res = makeStatPrompt(interaction, coin);
                res.type = InteractionResponseType.UpdateMessage;
                await http.send(res);
            } else if (split[1] == "directionundo") {
                const coin = idToMeta(Number(split[2]));
                const what = split[3];
                await http.send(makeThresholdPrompt(interaction, coin, what));
            } else if (split[1] == "confirmundo") {
                const coin = idToMeta(Number(split[2]));
                const what = split[3];
                const when = split[4];
                await http.send(makeDirectionPrompt(interaction, coin, what, when));
            }
            return;
        }
        if (interaction.data.custom_id.startsWith("coinalert_value")) {
            const coin = idToMeta(Number(interaction.data.custom_id.split("_")[2]));
            const what = interaction.data.custom_id.split("_")[3];
            await http.send({
                type: InteractionResponseType.Modal,
                data: {
                    title: `Setting threshold for ${CryptoStat.shortToLong(what)}`,
                    custom_id: `coinalert_thresholdmodal_${coin.cmc_id}_${what}`,
                    components: [{
                        type: ComponentType.ActionRow,
                        components: [{
                            type: ComponentType.TextInput,
                            label: "At what threshold should you be alerted?",
                            custom_id: "coinalert_thresholdmodalvalue",
                            style: TextInputStyle.Short,
                            required: true,
                            placeholder: "Enter a number"
                        }]
                    }]
                }
            } as APIModalInteractionResponse);
        } else if (interaction.data.custom_id.startsWith("coinalert_direction")) {
            const direction = interaction.data.custom_id.startsWith("coinalert_directiongreater") ? ">" : "<";
            const what = interaction.data.custom_id.split("_")[3], when = interaction.data.custom_id.split("_")[4];
            const coin = idToMeta(Number(interaction.data.custom_id.split("_")[2]));
            const message = getEmbedTemplate();
            message.title = `Adding alert for ${coin.name}`;
            message.description = `Great! You will be **DM'ed** when the ${CryptoStat.shortToLong(what)} of ${coin.name} is ${direction == ">" ? "greater than" : "less than"} ${when}. If you are satisfied, please click \`Confirm\` to activate this alert. Otherwise, click \`Go back\` to go back and make changes.`;
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
                                custom_id: `coinalert_confirmundo_${coin.cmc_id}_${what}_${when}`
                            },
                            {
                                type: ComponentType.Button,
                                custom_id: `coinalert_confirm_${coin.cmc_id}_${what}_${when}_${direction}`,
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
            const what = interaction.data.custom_id.split("_")[3];
            const when = interaction.data.custom_id.split("_")[4];
            const direction = interaction.data.custom_id.split("_")[5];
            const alert = new CoinAlert();
            alert.user = interaction.user.id;
            alert.coin = coin.cmc_id;
            alert.stat = what;
            alert.threshold = Number(when);
            alert.direction = direction;
            alert.disabled = false;
            const manageAlertLink = `</myalerts:${commandIds.get("myalerts")}>`;
            try {
                await validateAlert(alert);
            } catch (e) {
                await http.send({
                    type: InteractionResponseType.UpdateMessage, data: {
                        content: e,
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
                    coin: alert.coin,
                    stat: alert.stat,
                    threshold: alert.threshold,
                    direction: alert.direction
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
        }
    }

    /* istanbul ignore next */
    static override async processStringSelect(interaction: APIMessageComponentSelectMenuInteraction, http: FastifyReply) {

        if (interaction.data.custom_id.startsWith("coinalert_stat")) {
            const coin = idToMeta(Number(interaction.data.custom_id.split("_")[2]));
            const what = interaction.data.values[0];
            const response = makeThresholdPrompt(interaction, coin, what);
            await http.send(response);
        }
    }
}