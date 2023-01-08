import { EmbedBuilder } from "discord.js";
export function getEmbedTemplate(client) {
    return new EmbedBuilder().setFooter({
        text: client.user.username,
        iconURL: client.user.displayAvatarURL()
    }).setColor(0x2374ff);
}

//# sourceMappingURL=templates.js.map