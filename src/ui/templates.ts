/* istanbul ignore file */
import {APIEmbed} from "discord-api-types/v10";
import {client} from "../utils/discordUtils";

export function getEmbedTemplate(): APIEmbed {
    return {
        color: 0x2374ff,
        footer: {
            text: "Botchain",
            icon_url: `https://cdn.discordapp.com/avatars/${client.id}/${client.avatar}.png`
        }
    };
}