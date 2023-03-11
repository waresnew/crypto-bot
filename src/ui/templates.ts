/* istanbul ignore file */
import {client} from "../utils";
import {APIEmbed} from "discord-api-types/v10";

const randomFooters = [
    "Need help? Join the official support server: https://discord.gg/mpyPadCG3q",
    "Support the bot by running /vote!"
];
export function getEmbedTemplate(): APIEmbed {
    return {
        color: 0x2374ff,
        footer: {
            text: randomFooters[Math.floor(Math.random() * randomFooters.length)],
            icon_url: `https://cdn.discordapp.com/avatars/${client.id}/${client.avatar}.png`
        }
    };
}