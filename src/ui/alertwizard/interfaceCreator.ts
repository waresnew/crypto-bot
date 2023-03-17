import {
    APIInteraction,
    APIInteractionResponse,
    ButtonStyle,
    ComponentType,
    InteractionResponseType,
    MessageFlags
} from "discord-api-types/v10";
import {CryptoApiData} from "../../structs/cryptoapidata";
import {getEmbedTemplate} from "../templates";
import CryptoStat from "../../structs/cryptoStat";
import {commandIds} from "../../utils";

export function makeThresholdPrompt(interaction: APIInteraction, coin: CryptoApiData, what: string) {
    const message = getEmbedTemplate();
    message.title = `Adding alert for ${coin.name}`;
    message.description = `Great! You're now tracking the ${CryptoStat.shortToLong(what)} of ${coin.name}. At what threshold would you like to be alerted?`;
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
                        custom_id: `alertwizard_alertvalueundo_${coin.id}_${interaction.user.id}`
                    },
                    {
                        type: ComponentType.Button,
                        emoji: {
                            name: "🔢",
                            id: null
                        },
                        style: ButtonStyle.Primary,
                        label: "Set threshold",
                        custom_id: `alertwizard_alertvalue_${coin.id}_${what}_${interaction.user.id}`
                    }
                ]
            }]
        }
    } as APIInteractionResponse;
}

export function makeDirectionPrompt(interaction: APIInteraction, coin: CryptoApiData, what: string, when: string) {
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
                        custom_id: `alertwizard_alertdirectionundo_${coin.id}_${what}_${interaction.user.id}`
                    },
                    {
                        type: ComponentType.Button,
                        custom_id: `alertwizard_alertdirectiongreater_${coin.id}_${what}_${when}_${interaction.user.id}`,
                        label: `Greater than ${when}`,
                        style: ButtonStyle.Success,
                        emoji: {
                            name: "📈",
                            id: null
                        }
                    },
                    {
                        type: ComponentType.Button,
                        custom_id: `alertwizard_alertdirectionless_${coin.id}_${what}_${when}_${interaction.user.id}`,
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

export function makeStatPrompt(interaction: APIInteraction, coin: CryptoApiData) {
    const sortedOptions = CryptoStat.listLongs().sort((a, b) => a.length - b.length);
    const message = getEmbedTemplate();
    message.title = `Adding alert for ${coin.name}`;
    message.description = `You are currently adding an alert for ${coin.name}. If you want to track another coin, please pass a different coin to </coin:${commandIds.get("coin")}>.

Please select the stat you would like to be alerted by.`;
    return {
        type: InteractionResponseType.ChannelMessageWithSource, data: {
            embeds: [message],
            flags: MessageFlags.Ephemeral,
            components: [{
                type: ComponentType.ActionRow,
                components: [{
                    type: ComponentType.StringSelect,
                    placeholder: "Select a stat...",
                    custom_id: `alertwizard_alertstat_${coin.id}_${interaction.user.id}`,
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