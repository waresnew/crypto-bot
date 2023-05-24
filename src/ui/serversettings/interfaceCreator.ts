/* istanbul ignore file */
import {APIEmbed, APIInteraction, ComponentType} from "discord-api-types/v10";
import {ServerSettings} from "../../utils/database";
import {ServerSettingMetadata} from "../../structs/serverSetting";
import {getEmbedTemplate} from "../templates";

export const availableSettings: ServerSettingMetadata[] = [
    {
        name: "Alert Manager Role",
        description: "Use the dropdown menu below to select a role that will be able to manage server-specific alerts. People with the `Manage Server` permission will be able to manage alerts regardless of this setting.",
        dbKey: "alertManagerRole",
        type: "roleselect",
        default: null
    }
];

export async function renderSetting(interaction: APIInteraction, dbKey: string) {
    const settings = await ServerSettings.findOne({guild: interaction.guild_id});
    const meta = availableSettings.find(s => s.dbKey === dbKey);
    const cur = `\n\n**\`Current:\`** **${settings[meta.dbKey] == null ? "None" : meta.type == "roleselect" ? `<@&${settings[meta.dbKey]}>` : settings[meta.dbKey]}**`;
    const embed: APIEmbed = {
        ...getEmbedTemplate(),
        title: meta.name,
        description: meta.description + cur
    };
    if (meta.type === "roleselect") {
        return {
            embeds: [embed],
            components: [{
                type: ComponentType.ActionRow,
                components: [{
                    type: ComponentType.RoleSelect,
                    custom_id: `serversettings_${meta.dbKey}`,
                    placeholder: "Select a role"
                }]
            }]
        };
    } else {
        throw new Error("Invalid setting type: " + meta.type);
    }
}