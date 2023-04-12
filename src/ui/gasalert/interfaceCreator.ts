/* istanbul ignore file */
import {
    APIInteractionResponse,
    ButtonStyle,
    ComponentType,
    InteractionResponseType,
    MessageFlags
} from "discord-api-types/v10";
import {getEmbedTemplate} from "../templates";

export function makeSpeedPrompt() {
    return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
            flags: MessageFlags.Ephemeral,
            embeds: [
                {
                    ...getEmbedTemplate(),
                    title: "Adding alert for Ethereum Gas Prices",
                    description: "Which type of gas price would you like to be alerted for?"
                }
            ],
            components: [
                {
                    type: ComponentType.ActionRow,
                    components: [
                        {
                            type: ComponentType.Button,
                            label: "Slow",
                            emoji: {
                                name: "🐢",
                                id: null
                            },
                            style: ButtonStyle.Primary,
                            custom_id: "gasalert_speedslow"
                        },
                        {
                            type: ComponentType.Button,
                            label: "Normal",
                            emoji: {
                                name: "🚶",
                                id: null
                            },
                            style: ButtonStyle.Primary,
                            custom_id: "gasalert_speednormal"
                        },
                        {
                            type: ComponentType.Button,
                            label: "Fast",
                            emoji: {
                                name: "⚡",
                                id: null
                            },
                            style: ButtonStyle.Primary,
                            custom_id: "gasalert_speedfast"
                        }
                    ]
                }
            ]
        }
    } as APIInteractionResponse;
}

export function makeThresholdPrompt(speed: string) {
    return {
        type: InteractionResponseType.UpdateMessage,
        data: {
            flags: MessageFlags.Ephemeral,
            embeds: [
                {
                    ...getEmbedTemplate(),
                    title: "Adding alert for Ethereum Gas Prices",
                    description: `Great! You're now tracking the gas price for a ${speed} transaction on Ethereum. At what threshold would you like to be alerted?`
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
                            custom_id: "gasalert_thresholdundo"
                        },
                        {
                            type: ComponentType.Button,
                            label: "Set threshold",
                            emoji: {
                                name: "🔢",
                                id: null
                            },
                            style: ButtonStyle.Primary,
                            custom_id: `gasalert_threshold_${speed}`
                        }
                    ]
                }
            ]
        }
    } as APIInteractionResponse;
}