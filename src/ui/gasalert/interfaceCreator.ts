/* istanbul ignore file */
import {
    APIInteractionResponse,
    ButtonStyle,
    ComponentType,
    InteractionResponseType,
    MessageFlags
} from "discord-api-types/v10";
import {getEmbedTemplate} from "../templates";
import {AlertMethod} from "../../utils/alertUtils";

export function makeSpeedPrompt(alertMethod: AlertMethod, channel: string, role: string) {
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
                            label: "Go back",
                            emoji: {
                                name: "⬅️",
                                id: null
                            },
                            style: ButtonStyle.Secondary,
                            custom_id: `gasalert_speedundo_${alertMethod}_${channel}`
                        },
                        {
                            type: ComponentType.Button,
                            label: "Slow",
                            emoji: {
                                name: "🐢",
                                id: null
                            },
                            style: ButtonStyle.Primary,
                            custom_id: `gasalert_speedslow_${alertMethod}_${channel}_${role}`
                        },
                        {
                            type: ComponentType.Button,
                            label: "Normal",
                            emoji: {
                                name: "🚶",
                                id: null
                            },
                            style: ButtonStyle.Primary,
                            custom_id: `gasalert_speednormal_${alertMethod}_${channel}_${role}`
                        },
                        {
                            type: ComponentType.Button,
                            label: "Fast",
                            emoji: {
                                name: "⚡",
                                id: null
                            },
                            style: ButtonStyle.Primary,
                            custom_id: `gasalert_speedfast_${alertMethod}_${channel}_${role}`
                        }
                    ]
                }
            ]
        }
    } as APIInteractionResponse;
}

export function makeThresholdPrompt(alertMethod: AlertMethod, channel: string, role: string, speed: string) {
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
                            style: ButtonStyle.Secondary,
                            custom_id: `gasalert_thresholdundo_${alertMethod}_${channel}_${role}`
                        },
                        {
                            type: ComponentType.Button,
                            label: "Set threshold",
                            emoji: {
                                name: "🔢",
                                id: null
                            },
                            style: ButtonStyle.Primary,
                            custom_id: `gasalert_threshold_${alertMethod}_${channel}_${role}_${speed}`
                        }
                    ]
                }
            ]
        }
    } as APIInteractionResponse;
}

export function makeGuildDmPrompt() {
    const message = getEmbedTemplate();
    message.title = "Adding alert for Ethereum Gas Prices";
    message.description = "Would you like to be alerted in a channel (public) or in your DMs (private)?";
    return {
        type: InteractionResponseType.ChannelMessageWithSource, data: {
            embeds: [message],
            flags: MessageFlags.Ephemeral,
            components: [{
                type: ComponentType.ActionRow,
                components: [
                    {
                        type: ComponentType.Button,
                        emoji: {
                            name: "🌎",
                            id: null
                        },
                        style: ButtonStyle.Primary,
                        label: "Channel",
                        custom_id: "gasalert_guild"
                    },
                    {
                        type: ComponentType.Button,
                        emoji: {
                            name: "🔒",
                            id: null
                        },
                        style: ButtonStyle.Primary,
                        label: "DMs",
                        custom_id: "gasalert_dm"
                    }
                ]
            }]
        }
    } as APIInteractionResponse;
}

//guild only
export function makeChannelPrompt() {
    const message = getEmbedTemplate();
    message.title = "Adding alert for Ethereum Gas Prices";
    message.description = "Please select a channel to send this alert to.\n\n**Note: Please ensure that Botchain has permissions to send messages in the channel you select, or else the alert might silently fail to trigger.**";
    return {
        type: InteractionResponseType.UpdateMessage, data: {
            embeds: [message],
            flags: MessageFlags.Ephemeral,
            components: [
                {
                    type: ComponentType.ActionRow,
                    components: [{
                        type: ComponentType.ChannelSelect,
                        placeholder: "Select a channel...",
                        custom_id: "gasalert_channel"
                    }]
                },
                {
                    type: ComponentType.ActionRow,
                    components: [{
                        type: ComponentType.Button,
                        emoji: {
                            name: "⬅️",
                            id: null
                        },
                        style: ButtonStyle.Secondary,
                        label: "Go back",
                        custom_id: "gasalert_channelundo"
                    }]
                }
            ]
        }
    } as APIInteractionResponse;
}

//guild only
export function makeRolePingPrompt(channel: string) {
    const message = getEmbedTemplate();
    message.title = "Adding alert for Ethereum Gas Prices";
    message.description = "Please select a role to ping when the alert is triggered. **Ensure that you have enabled \"Allow anynone to @mention this role\" for the role you selected, or give Botchain the \"Mention @everyone\" permission.**\n\nIf you do not want to ping a role, please click the \"Skip\" button.";
    return {
        type: InteractionResponseType.UpdateMessage, data: {
            embeds: [message],
            flags: MessageFlags.Ephemeral,
            components: [
                {
                    type: ComponentType.ActionRow,
                    components: [
                        {
                            type: ComponentType.RoleSelect,
                            placeholder: "Select a role...",
                            custom_id: `gasalert_role_${channel}`
                        }
                    ]
                },
                {
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
                            custom_id: "gasalert_roleundo"
                        },
                        {
                            type: ComponentType.Button,
                            emoji: {
                                name: "⏭️",
                                id: null
                            },
                            style: ButtonStyle.Success,
                            label: "Skip",
                            custom_id: `gasalert_roleskip_${channel}`
                        }
                    ]
                }
            ]
        }
    } as APIInteractionResponse;
}
