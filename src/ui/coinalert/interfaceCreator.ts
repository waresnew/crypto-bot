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

export function makeThresholdPrompt(interaction: APIInteraction, coin: CoinMetadata, what: string) {
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
                        style: ButtonStyle.Primary,
                        label: "Go back",
                        custom_id: `coinalert_valueundo_${coin.cmc_id}`
                    },
                    {
                        type: ComponentType.Button,
                        emoji: {
                            name: "🔢",
                            id: null
                        },
                        style: ButtonStyle.Primary,
                        label: "Set threshold",
                        custom_id: `coinalert_value_${coin.cmc_id}_${what}`
                    }
                ]
            }]
        }
    } as APIInteractionResponse;
}

export function makeDirectionPrompt(interaction: APIInteraction, coin: CoinMetadata, what: string, when: string) {
    const message = getEmbedTemplate();
    message.title = `Adding alert for ${coin.name}`;
    message.description = `Great! Now, do you want to be alerted when the ${CryptoStat.shortToLong(what)} of ${coin.name} is above or below ${when}?`;
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
                        style: ButtonStyle.Primary,
                        label: "Go back",
                        custom_id: `coinalert_directionundo_${coin.cmc_id}_${what}`
                    },
                    {
                        type: ComponentType.Button,
                        custom_id: `coinalert_directiongreater_${coin.cmc_id}_${what}_${when}`,
                        label: `Greater than ${when}`,
                        style: ButtonStyle.Success,
                        emoji: {
                            name: "📈",
                            id: null
                        }
                    },
                    {
                        type: ComponentType.Button,
                        custom_id: `coinalert_directionless_${coin.cmc_id}_${what}_${when}`,
                        label: `Less than ${when}`,
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

export function makeStatPrompt(interaction: APIInteraction, coin: CoinMetadata) {
    const sortedOptions = CryptoStat.listLongs().sort((a, b) => a.length - b.length);
    const message = getEmbedTemplate();
    message.title = `Adding alert for ${coin.name}`;
    message.description = `You are currently adding an alert for ${coin.name}. If you want to track another coin, please pass a different coin to </coinalert:${commandIds.get("coinalert")}>.

Please select the stat you would like to be alerted by.

eg. Select \`price\` to track the price, or select \`${CryptoStat.shortToLong("1h%")}\` to track the 1 hour percentage change of the price.`;
    return {
        type: InteractionResponseType.ChannelMessageWithSource, data: {
            embeds: [message],
            flags: MessageFlags.Ephemeral,
            components: [{
                type: ComponentType.ActionRow,
                components: [{
                    type: ComponentType.StringSelect,
                    placeholder: "Select a stat...",
                    custom_id: `coinalert_stat_${coin.cmc_id}`,
                    options: sortedOptions.map(entry => {
                        return {
                            label: entry[0].toUpperCase() + entry.substring(1),
                            value: CryptoStat.longToShort(entry)
                        };
                    })
                }]
            }]
        }
    };
}