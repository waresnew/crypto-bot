import {
    ActionRowBuilder,
    BaseInteraction,
    ButtonBuilder,
    ButtonStyle,
    Client,
    StringSelectMenuBuilder
} from "discord.js";
import {db} from "../../database.js";
import {CryptoApiData} from "../../structs/cryptoapidata.js";
import {UserSettingType} from "../../structs/usersettings.js";
import {getEmbedTemplate} from "../templates.js";
import {scientificNotationToNumber} from "../../utils.js";

export async function makeFavouritesMenu(interaction: BaseInteraction) {
    const selectFavs = new StringSelectMenuBuilder()
        .setCustomId(`coin_favCoins_${interaction.user.id}`)
        .setPlaceholder("Quickly access your favourites...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const favs = await db.all("select favouriteCrypto from user_settings where type=? and id=?", UserSettingType[UserSettingType.FAVOURITE_CRYPTO], interaction.user.id);

    for (let i = 0; i < favs.length; i++) {
        const row = favs[i];
        const favName = await db.get("select name from cmc_cache where id=?", row.favouriteCrypto);
        if (favName) {
            selectFavs.addOptions({label: favName.name, value: row.favouriteCrypto.toString()});
        }
    }
    if (selectFavs.options.length == 0) {
        selectFavs.addOptions({label: "Favourite a coin to add it here!", value: "default"});
    }

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectFavs);

}

export function makeEmbed(choice: CryptoApiData, client: Client) {
    return getEmbedTemplate(client)
        .setThumbnail(`https://s2.coinmarketcap.com/static/img/coins/128x128/${choice.id}.png`)
        .setColor(choice.percent_change_24h < 0 ? 0xed4245 : 0x3ba55c)
        .setTitle(`${choice.name} (${choice.symbol}-USD)`)
        .setURL(`https://coinmarketcap.com/currencies/${choice.slug}`)
        .setFields({
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
        );
}

export async function makeButtons(choice: CryptoApiData, interaction: BaseInteraction) {
    const favourited = Object.values(await db.get("select exists(select 1 from user_settings where id=? and favouriteCrypto=?)", interaction.user.id, choice.id))[0];
    return new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`coin_alerts_${interaction.user.id}`)
                .setLabel("Add alert")
                .setEmoji("🔔")
                .setStyle(ButtonStyle.Primary)
        )
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`coin_setfav_${interaction.user.id}`)
                .setLabel(favourited ? "Unfavourite" : "Favourite")
                .setEmoji("⭐")
                .setStyle(favourited ? ButtonStyle.Secondary : ButtonStyle.Primary)
        )
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`coin_refresh_${interaction.user.id}`)
                .setLabel("Refresh")
                .setEmoji("🔄")
                .setStyle(ButtonStyle.Primary)
        );
}
