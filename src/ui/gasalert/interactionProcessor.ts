/* istanbul ignore file */
import InteractionProcessor from "../abstractInteractionProcessor";
import {FastifyReply} from "fastify";
import {
    APIMessageComponentButtonInteraction,
    APIModalInteractionResponse,
    APIModalSubmitInteraction,
    ButtonStyle,
    ComponentType,
    InteractionResponseType,
    MessageFlags,
    TextInputStyle
} from "discord-api-types/v10";
import {makeSpeedPrompt, makeThresholdPrompt} from "./interfaceCreator";
import {validateWhen} from "../../utils/utils";
import {analytics} from "../../utils/analytics";
import {getEmbedTemplate} from "../templates";
import {GasAlert} from "../../structs/alert/gasAlert";
import {validateAlert} from "../../utils/alertUtils";
import {GasAlerts} from "../../utils/database";
import {commandIds} from "../../utils/discordUtils";
import {UserError} from "../../structs/userError";

export default class GasAlertInteractionProcessor extends InteractionProcessor {
    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply): Promise<void> {
        if (interaction.data.custom_id.split("_")[1].endsWith("undo")) {
            const split = interaction.data.custom_id.split("_");
            if (split[1] == "thresholdundo") {
                const res = makeSpeedPrompt();
                res.type = InteractionResponseType.UpdateMessage;
                await http.send(res);
            } else if (split[1] == "confirmundo") {
                const speed = split[2];
                await http.send(makeThresholdPrompt(speed));
            }
        }
        if (interaction.data.custom_id.startsWith("gasalert_speed")) {
            const speed = interaction.data.custom_id.split("_")[1].substring("speed".length);
            await http.send(makeThresholdPrompt(speed));
        } else if (interaction.data.custom_id.startsWith("gasalert_threshold")) {
            const split = interaction.data.custom_id.split("_");
            const speed = split[2];
            await http.send({
                type: InteractionResponseType.Modal,
                data: {
                    title: `Setting threshold for ${speed} gas price`,
                    custom_id: `gasalert_thresholdmodal_${speed}`,
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
            const alert = new GasAlert();
            const tokens = interaction.data.custom_id.split("_");
            alert.user = interaction.user.id;
            alert.speed = tokens[2];
            alert.threshold = Number(tokens[3]);
            alert.disabled = false;
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
                    threshold: alert.threshold
                }
            });
            const manageAlertLink = `</myalerts:${commandIds.get("myalerts")}>`;
            await GasAlerts.insertOne(alert);
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    content: `Done! Added and enabled alert. Manage your alerts with ${manageAlertLink}. Please make sure you stay in a server with Botchain in it, so it can DM you when your alert triggers.`,
                    flags: MessageFlags.Ephemeral,
                    embeds: [],
                    components: []
                }
            });
        }
    }

    static override async processModal(interaction: APIModalSubmitInteraction, http: FastifyReply): Promise<void> {
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
            const speed = interaction.data.custom_id.split("_")[2];
            await http.send({
                type: InteractionResponseType.UpdateMessage,
                data: {
                    flags: MessageFlags.Ephemeral,
                    embeds: [
                        {
                            ...getEmbedTemplate(),
                            title: "Adding alert for Ethereum Gas Prices",
                            description: `Great! You will be **DM'ed** when the gas fee for a ${speed} transaction is less than ${when}. If you are satisfied, please click \`Confirm\` to activate this alert. Otherwise, click \`Go back\` to go back and make changes.`
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
                                    style: ButtonStyle.Primary,
                                    custom_id: `gasalert_confirmundo_${speed}`
                                },
                                {
                                    type: ComponentType.Button,
                                    label: "Confirm",
                                    emoji: {
                                        name: "✅",
                                        id: null
                                    },
                                    style: ButtonStyle.Success,
                                    custom_id: `gasalert_confirm_${speed}_${when}`
                                }
                            ]
                        }
                    ]
                }
            });
        }
    }
}