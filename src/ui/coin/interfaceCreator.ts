import {db, getCmcCache} from "../../database";
import {CryptoApiData} from "../../structs/cryptoapidata";
import {UserSettingType} from "../../structs/usersettings";
import {getEmbedTemplate} from "../templates";
import {scientificNotationToNumber} from "../../utils";
import {
    APIActionRowComponent,
    APIButtonComponent,
    APIInteraction,
    ButtonStyle,
    ComponentType
} from "discord-api-types/v10";
import {APIStringSelectComponent} from "discord-api-types/payloads/v10/channel";

export async function makeFavouritesMenu(interaction: APIInteraction) {
    const selectFavs: APIActionRowComponent<APIStringSelectComponent> = {
        type: ComponentType.ActionRow,
        components: [{
            type: ComponentType.StringSelect,
            custom_id: `coin_favCoins_${interaction.user.id}`,
            placeholder: "Quickly access your favourites...",
            options: []
        }]

    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const favs = await db.all("select favouriteCrypto from user_settings where type=? and id=?", UserSettingType[UserSettingType.FAVOURITE_CRYPTO], interaction.user.id);

    for (let i = 0; i < favs.length; i++) {
        const row = favs[i];
        const favName = await getCmcCache("select name from cmc_cache where id=?", row.favouriteCrypto);
        if (favName) {
            selectFavs.components[0].options.push({label: favName.name, value: row.favouriteCrypto.toString()});
        }
    }
    if (selectFavs.components[0].options.length == 0) {
        selectFavs.components[0].options.push({label: "Favourite a coin to add it here!", value: "default"});
    }

    return selectFavs;

}

export function makeEmbed(choice: CryptoApiData) {
    const embed = getEmbedTemplate();
    embed.thumbnail = {
        url: `https://s2.coinmarketcap.com/static/img/coins/128x128/${choice.id}.png`
    };
    embed.color = choice.percent_change_24h < 0 ? 0xed4245 : 0x3ba55c;
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
        {name: "Last Updated", value: `<t:${new Date(choice.last_updated).getTime() / 1000}:R>`}
    ];
    return embed;
}

export async function makeButtons(choice: CryptoApiData, interaction: APIInteraction) {
    const favouritedEntry = await db.get("select exists(select 1 from user_settings where id=? and favouriteCrypto=? and type=?)", interaction.user.id, choice.id, UserSettingType[UserSettingType.FAVOURITE_CRYPTO]);
    const favourited = Object.values(favouritedEntry)[0];
    return {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                custom_id: `coin_alerts_${interaction.user.id}`,
                label: "Add alert",
                emoji: {
                    id: null,
                    name: "🔔"
                },
                style: ButtonStyle.Primary
            },
            {
                type: ComponentType.Button,
                custom_id: `coin_setfav_${interaction.user.id}`,
                label: favourited ? "Unfavourite" : "Favourite",
                emoji: {
                    id: null,
                    name: "⭐"
                },
                style: favourited ? ButtonStyle.Secondary : ButtonStyle.Primary
            },
            {
                type: ComponentType.Button,
                custom_id: `coin_refresh_${interaction.user.id}`,
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
