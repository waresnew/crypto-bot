import {CmcLatestListing} from "../../structs/cmcLatestListing";
import {getEmbedTemplate} from "../templates";
import {scientificNotationToNumber} from "../../utils";
import {
    APIActionRowComponent,
    APIButtonComponent,
    APIInteraction,
    ButtonStyle,
    ComponentType
} from "discord-api-types/v10";

export function makeEmbed(choice: CmcLatestListing) {
    const embed = getEmbedTemplate();
    embed.thumbnail = {
        url: `https://s2.coinmarketcap.com/static/img/coins/128x128/${choice.id}.png`
    };
    embed.color = choice.percent_change_7d < 0 ? 0xed4245 : 0x3ba55c;
    embed.title = `${choice.name} (${choice.symbol}-USD)`;
    embed.url = `https://coinmarketcap.com/currencies/${choice.slug}`;
    embed.fields = [{
        name: "Price",
        value: `$${choice.price < 1 ? scientificNotationToNumber(choice.price.toPrecision(4)) : Math.round(choice.price * 100) / 100} ${choice.percent_change_24h < 0 ? "🔴" : "🟢"}`
    },
        {
            name: "1h Change",
            value: `${Math.round(choice.percent_change_1h * 100) / 100}% ${choice.percent_change_1h < 0 ? "🔴" : "🟢"}`,
            inline: true
        },
        {
            name: "24h Change",
            value: `${Math.round(choice.percent_change_24h * 100) / 100}% ${choice.percent_change_24h < 0 ? "🔴" : "🟢"}`,
            inline: true
        },
        {
            name: "7d Change",
            value: `${Math.round(choice.percent_change_7d * 100) / 100}% ${choice.percent_change_7d < 0 ? "🔴" : "🟢"}`,
            inline: true
        },
        {
            name: "24h Volume Change",
            value: `${Math.round(choice.volume_change_24h * 100) / 100}% ${choice.volume_change_24h < 0 ? "🔴" : "🟢"}`,
            inline: true
        },
        {
            name: "Market Cap Dominance",
            value: `${Math.round(choice.market_cap_dominance * 100) / 100}%`,
            inline: true
        },
        {name: "Last Updated", value: `<t:${Math.floor(new Date(choice.last_updated).getTime() / 1000)}:R>`}
    ];
    return embed;
}

export async function makeButtons(choice: CmcLatestListing, interaction: APIInteraction) {
    return {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                custom_id: `coin_alerts_${choice.id}_${interaction.user.id}`,
                label: "Add alert",
                emoji: {
                    id: null,
                    name: "🔔"
                },
                style: ButtonStyle.Primary
            },
            {
                type: ComponentType.Button,
                custom_id: `coin_refresh_${choice.id}_${interaction.user.id}`,
                label: "Refresh",
                emoji: {
                    id: null,
                    name: "🔄"
                },
                style: ButtonStyle.Primary
            }
        ]
    } as APIActionRowComponent<APIButtonComponent>;
}
