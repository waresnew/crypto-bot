import {client} from "../utils";
import {APIEmbed} from "discord-api-types/v10";

export function getEmbedTemplate(): APIEmbed {
    return {
        color: 0x2374ff,
        footer: {
            text: client.username,
            icon_url: `https://cdn.discordapp.com/avatars/${client.id}/${client.avatar}.png`
        }
    };
}