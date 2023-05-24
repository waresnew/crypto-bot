/* istanbul ignore file */
import {
    APIInteraction,
    APIInteractionResponse,
    ButtonStyle,
    ComponentType,
    InteractionResponseType,
    MessageFlags
} from "discord-api-types/v10";
import {getEmbedTemplate} from "../templates";
import CryptoStat from "../../structs/cryptoStat";
import {CoinMetadata} from "../../structs/coinMetadata";
import {commandIds} from "../../utils/discordUtils";
import BigNumber from "bignumber.js";
import {AlertMethod} from "../../utils/alertUtils";

export function makeThresholdPrompt(interaction: APIInteraction, coin: CoinMetadata, alertMethod: AlertMethod, role: string, what: string) {
    const message = getEmbedTemplate();
    message.title = `Adding alert for ${coin.name}`;
    message.description = `Great! You're now tracking the ${CryptoStat.shortToLong(what)} of ${coin.name}. What value should the ${CryptoStat.shortToLong(what)} rise/fall to before alerting you?

eg. Enter \`500\` to be alerted when the ${CryptoStat.shortToLong(what)} reaches 500, or enter \`-5\` to be alerted when the ${CryptoStat.shortToLong(what)} reaches -5.`;
    return {
        type: InteractionResponseType.UpdateMessage, data: {
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
                        custom_id: `coinalert_valueundo_${coin.cmc_id}_${alertMethod}_${role}`
                    },
                    {
                        type: ComponentType.Button,
                        emoji: {
                            name: "🔢",
                            id: null
                        },
                        style: ButtonStyle.Primary,
                        label: "Set threshold",
                        custom_id: `coinalert_value_${coin.cmc_id}_${alertMethod}_${role}_${what}`
                    }
                ]
            }]
        }
    } as APIInteractionResponse;
}

export function makeDirectionPrompt(interaction: APIInteraction, coin: CoinMetadata, alertMethod: AlertMethod, role: string, what: string, when: string) {
    const message = getEmbedTemplate();
    message.title = `Adding alert for ${coin.name}`;
    message.description = `Great! Now, do you want to be alerted when the ${CryptoStat.shortToLong(what)} of ${coin.name} is above or below ${new BigNumber(when).toString()}?`;
    return {
        type: InteractionResponseType.UpdateMessage,
        flags: MessageFlags.Ephemeral,
        data: {
            embeds: [message],
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
                        custom_id: `coinalert_directionundo_${coin.cmc_id}_${alertMethod}_${role}_${what}`
                    },
                    {
                        type: ComponentType.Button,
                        custom_id: `coinalert_greater_${coin.cmc_id}_${alertMethod}_${role}_${what}_${when}`,
                        label: `Greater than ${new BigNumber(when).toString()}`,
                        style: ButtonStyle.Success,
                        emoji: {
                            name: "📈",
                            id: null
                        }
                    },
                    {
                        type: ComponentType.Button,
                        custom_id: `coinalert_less_${coin.cmc_id}_${alertMethod}_${role}_${what}_${when}`,
                        label: `Less than ${new BigNumber(when).toString()}`,
                        style: ButtonStyle.Danger,
                        emoji: {
                            name: "📉",
                            id: null
                        }
                    }
                ]
            }]
        }
    } as APIInteractionResponse;
}

export function makeStatPrompt(interaction: APIInteraction, coin: CoinMetadata, alertMethod: AlertMethod, role: string) {
    const sortedOptions = CryptoStat.listLongs().sort((a, b) => a.length - b.length);
    const message = getEmbedTemplate();
    message.title = `Adding alert for ${coin.name}`;
    message.description = `Please select the stat you would like to be alerted by.

eg. Select \`price\` to track the price, or select \`${CryptoStat.shortToLong("1h%")}\` to track the 1 hour percentage change of the price.`;
    return {
        type: InteractionResponseType.UpdateMessage, data: {
            embeds: [message],
            flags: MessageFlags.Ephemeral,
            components: [
                {
                    type: ComponentType.ActionRow,
                    components: [{
                        type: ComponentType.StringSelect,
                        placeholder: "Select a stat...",
                        custom_id: `coinalert_stat_${coin.cmc_id}_${alertMethod}_${role}`,
                        options: sortedOptions.map(entry => {
                            return {
                                label: entry[0].toUpperCase() + entry.substring(1),
                                value: CryptoStat.longToShort(entry)
                            };
                        })
                    }]
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
                            custom_id: `coinalert_statundo_${coin.cmc_id}_${alertMethod}`
                        }
                    ]
                }
            ]
        }
    } as APIInteractionResponse;
}

//guild only
export function makeRolePingPrompt(interaction: APIInteraction, coin: CoinMetadata) {
    const message = getEmbedTemplate();
    message.title = `Adding alert for ${coin.name}`;
    message.description = "Please select a role to ping when the alert is triggered. **Ensure that you have enabled \"Allow anyone to @mention this role\" for the role you selected, or give Botchain the \"Mention @everyone\" permission.**\n\nIf you do not want to ping a role, please click the \"Skip\" button.";
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
                            custom_id: `coinalert_role_${coin.cmc_id}`
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
                            custom_id: `coinalert_roleundo_${coin.cmc_id}`
                        },
                        {
                            type: ComponentType.Button,
                            emoji: {
                                name: "⏭️",
                                id: null
                            },
                            style: ButtonStyle.Success,
                            label: "Skip",
                            custom_id: `coinalert_roleskip_${coin.cmc_id}`
                        }
                    ]
                }
            ]
        }
    } as APIInteractionResponse;
}

export function makeGuildDmPrompt(interaction: APIInteraction, coin: CoinMetadata) {
    const message = getEmbedTemplate();
    message.title = `Adding alert for ${coin.name}`;
    message.description = `You are currently adding an alert for ${coin.name}. If you want to track another coin, please pass a different coin to </coinalert:${commandIds.get("coinalert")}>.

Would you like to be alerted in this channel (public) or in your DMs (private)?`;
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
                        label: "This channel",
                        custom_id: `coinalert_guild_${coin.cmc_id}`
                    },
                    {
                        type: ComponentType.Button,
                        emoji: {
                            name: "🔒",
                            id: null
                        },
                        style: ButtonStyle.Primary,
                        label: "DMs",
                        custom_id: `coinalert_dm_${coin.cmc_id}`
                    }
                ]
            }]
        }
    } as APIInteractionResponse;
}