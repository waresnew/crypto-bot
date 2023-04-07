/* istanbul ignore file */
import {getEmbedTemplate} from "../templates";
import {scientificNotationToNumber} from "../../utils";
import {
    APIActionRowComponent,
    APIButtonComponent,
    APIInteraction,
    ButtonStyle,
    ComponentType
} from "discord-api-types/v10";
import {CoinMetadata} from "../../structs/coinMetadata";
import {calcStat} from "../../structs/latestCoin";
import {LatestCoins} from "../../database";

export async function makeEmbed(choice: CoinMetadata) {
    const embed = getEmbedTemplate();
    embed.thumbnail = {
        url: `https://s2.coinmarketcap.com/static/img/coins/128x128/${choice.cmc_id}.png`
    };
    embed.color = await calcStat(choice.cmc_id, "7d%") < 0 ? 0xed4245 : 0x3ba55c;
    embed.title = `${choice.name} (${choice.symbol}/USDT)`;
    embed.url = `https://coinmarketcap.com/currencies/${choice.slug}`;
    const price = await calcStat(choice.cmc_id, "price");
    const hourChange = await calcStat(choice.cmc_id, "1h%");
    const dayChange = await calcStat(choice.cmc_id, "24h%");
    const weekChange = await calcStat(choice.cmc_id, "7d%");
    const volumeChange = await calcStat(choice.cmc_id, "volume%");
    embed.fields = [{
        name: "Price",
        value: `$${price < 1 ? scientificNotationToNumber(price.toPrecision(4)) : Math.round(price * 100) / 100} ${weekChange < 0 ? "🔴" : "🟢"}`
    },
        {
            name: "1h Change",
            value: `${Math.round(hourChange * 100) / 100}% ${hourChange < 0 ? "🔴" : "🟢"}`,
            inline: true
        },
        {
            name: "24h Change",
            value: `${Math.round(dayChange * 100) / 100}% ${dayChange < 0 ? "🔴" : "🟢"}`,
            inline: true
        },
        {
            name: "7d Change",
            value: `${Math.round(weekChange * 100) / 100}% ${weekChange < 0 ? "🔴" : "🟢"}`,
            inline: true
        },
        {
            name: "24h Volume Change",
            value: `${Math.round(volumeChange * 100) / 100}% ${volumeChange < 0 ? "🔴" : "🟢"}`,
            inline: true
        },
        {
            name: "Last Updated",
            value: `<t:${Math.floor((await LatestCoins.findOne({coin: choice.cmc_id}, {sort: {open_time: -1}})).open_time / 1000)}:R>`
        }
    ];
    return embed;
}

export async function makeButtons(choice: CoinMetadata, interaction: APIInteraction) {
    return {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                custom_id: `coin_refresh_${choice.cmc_id}`,
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
