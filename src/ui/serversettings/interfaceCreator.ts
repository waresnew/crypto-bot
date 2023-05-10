import {APIEmbed, APIInteraction} from "discord-api-types/v10";
import {ServerSettings} from "../../utils/database";

export async function makeEmbed(interaction: APIInteraction) {
    const settings = await ServerSettings.findOne({guild: interaction.guild_id});
    return {
        title: "Alert Manager",
        description: `Select a role that will be able to manage server-specific alerts.\n\n**\`Current:\`** \`${settings.alertManagerRole ?? "None"}\``
    } as APIEmbed;
}