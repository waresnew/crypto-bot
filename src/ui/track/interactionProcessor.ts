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
import {analytics} from "../../segment";
import {commandIds} from "../../utils";
import {makeDirectionPrompt, makeStatPrompt, makeThresholdPrompt} from "./interfaceCreator";
import {idToMeta} from "../../structs/coinMetadata";
import {CoinAlert} from "../../structs/coinAlert";
import {CoinAlerts} from "../../database";

export default class TrackInteractionProcessor extends InteractionProcessor {
    static validateWhen(when: string) {
        if (!when) {
            throw "Error: You did not specify a threshold. Please try again.";
        }
        if (when.length > 10) {
            throw "Error: The threshold you specified was too long. Please note that we only support thresholds from negative one billion to positive one billion.";
        }
        if (isNaN(Number(when)) || isNaN(parseFloat(when))) {
            throw "Error: The specified threshold was not a number.";
        }
        if (Math.abs(Number(when)) > 1000000000) {
            throw "Error: The threshold you specified was too high. Please ensure it is between negative one billion and positive one billion.";
        }
    }

    /* istanbul ignore next */
    static override async processModal(interaction: APIModalSubmitInteraction, http: FastifyReply): Promise<void> {
        if (interaction.data.custom_id.startsWith("track_alertthresholdmodal")) {
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
            const coin = idToMeta(Number(interaction.data.custom_id.split("_")[2]));
            const what = interaction.data.custom_id.split("_")[3];
            await http.send(makeDirectionPrompt(interaction, coin, what, when));
        }
    }

    /* istanbul ignore next */
    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply) {
        if (interaction.data.custom_id.split("_")[1].endsWith("undo")) {
            const split = interaction.data.custom_id.split("_");
            if (split[1] == "alertvalueundo") {
                const coin = idToMeta(Number(split[2]));
                const res = makeStatPrompt(interaction, coin);
                res.type = InteractionResponseType.UpdateMessage;
                await http.send(res);
            } else if (split[1] == "alertdirectionundo") {
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
        if (interaction.data.custom_id.startsWith("track_alertvalue")) {
            const coin = idToMeta(Number(interaction.data.custom_id.split("_")[2]));
            const what = interaction.data.custom_id.split("_")[3];
            http.send({
                type: InteractionResponseType.Modal,
                data: {
                    title: `Setting threshold for ${CryptoStat.shortToLong(what)}`,
                    custom_id: `track_alertthresholdmodal_${coin.cmc_id}_${what}`,
                    components: [{
                        type: ComponentType.ActionRow,
                        components: [{
                            type: ComponentType.TextInput,
                            label: "At what threshold should you be alerted?",
                            custom_id: "track_alertthresholdmodalvalue",
                            style: TextInputStyle.Short,
                            required: true,
                            placeholder: "Enter a number"
                        }]
                    }]
                }
            } as APIModalInteractionResponse);
        } else if (interaction.data.custom_id.startsWith("track_alertdirection")) {
            const direction = interaction.data.custom_id.startsWith("track_alertdirectiongreater") ? ">" : "<";
            const what = interaction.data.custom_id.split("_")[3], when = interaction.data.custom_id.split("_")[4];
            const coin = idToMeta(Number(interaction.data.custom_id.split("_")[2]));
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
                                custom_id: `track_confirmundo_${coin.cmc_id}_${what}_${when}`
                            },
                            {
                                type: ComponentType.Button,
                                custom_id: `track_confirm_${coin.cmc_id}_${what}_${when}_${direction}`,
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
        } else if (interaction.data.custom_id.startsWith("track_confirm")) {
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
            const manageAlertLink = `</alerts:${commandIds.get("alerts")}>`;
            try {
                await this.validateAlert(alert);
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
                    content: `Done! Added and enabled alert for ${coin.name}. Manage your alerts with ${manageAlertLink}`,
                    flags: MessageFlags.Ephemeral,
                    embeds: [],
                    components: []
                }
            });
        }
    }

    static async validateAlert(alert: CoinAlert) {
        const manageAlertLink = `</alerts:${commandIds.get("alerts")}>`;
        if ((await CoinAlerts.find({user: alert.user}).toArray()).length >= 25) {
            analytics.track({
                userId: alert.user,
                event: "Alert Creation Failed",
                properties: {
                    reason: "Too many alerts"
                }
            });
            throw `Error: You can not have more than 25 alerts set. Please delete one before proceeding. ${manageAlertLink}`;
        }
        if ((await CoinAlerts.find({
            user: alert.user,
            coin: alert.coin,
            stat: alert.stat,
            threshold: alert.threshold,
            direction: alert.direction
        }).toArray()).length > 0) {
            analytics.track({
                userId: alert.user,
                event: "Alert Creation Failed",
                properties: {
                    reason: "Duplicate alert"
                }
            });
            throw `Error: You already have an alert exactly like the one you are trying to add. Please delete it before proceeding. ${manageAlertLink}`;
        }
    }

    /* istanbul ignore next */
    static override async processStringSelect(interaction: APIMessageComponentSelectMenuInteraction, http: FastifyReply) {

        if (interaction.data.custom_id.startsWith("track_alertstat")) {
            const coin = idToMeta(Number(interaction.data.custom_id.split("_")[2]));
            const what = interaction.data.values[0];
            const response = makeThresholdPrompt(interaction, coin, what);
            await http.send(response);
        }
    }
}