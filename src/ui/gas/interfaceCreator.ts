/* istanbul ignore file */
import {getEmbedTemplate} from "../templates";
import {etherscanLastUpdated, gasPrices} from "../../services/etherscanRest";
import {APIActionRowComponent, APIButtonComponent, ButtonStyle, ComponentType} from "discord-api-types/v10";

export function makeEmbed() {
    return {
        ...getEmbedTemplate(),
        title: "Ethereum Gas Prices",
        thumbnail: {
            url: "https://s2.coinmarketcap.com/static/img/coins/128x128/1027.png"
        },
        fields: [
            {
                name: "Slow 🐢",
                value: gasPrices["slow"] + " gwei",
                inline: true
            },
            {
                name: "Normal 🚶",
                value: gasPrices["normal"] + " gwei",
                inline: true
            },
            {
                name: "Fast ⚡",
                value: gasPrices["fast"] + " gwei",
                inline: true
            },
            {
                name: "Last Updated",
                value: `<t:${Math.floor(etherscanLastUpdated / 1000)}:R>`
            }
        ]
    };
}

export function makeButtons() {
    return {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                style: ButtonStyle.Primary,
                label: "Refresh",
                custom_id: "gas_refresh",
                emoji: {
                    id: null,
                    name: "🔄"
                }
            }
        ]
    } as APIActionRowComponent<APIButtonComponent>;
}