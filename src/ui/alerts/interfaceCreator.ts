import {
    ActionRowBuilder,
    BaseInteraction,
    ButtonBuilder, ButtonStyle, Client,
    SelectMenuComponentOptionData,
    StringSelectMenuBuilder
} from "discord.js";
import {whatOptions} from "../../utils.js";
import {idToApiData} from "../../api/cmcApi.js";
import {UserSetting, UserSettingType} from "../../structs/usersettings.js";
import {db} from "../../database.js";
import {getEmbedTemplate} from "../templates.js";

export async function makeAlertsMenu(interaction: BaseInteraction) {
    const alerts: UserSetting[] = [];
    await db.each("select * from user_settings where type=? and id=?", UserSettingType[UserSettingType.ALERT], interaction.user.id, (err, row) => {
        if (err) {
            throw err;
        }
        alerts.push(row as UserSetting);
    });
    const alertMenuOptions: SelectMenuComponentOptionData[] = [];
    for (const alert of alerts) {
        const fancyStat = whatOptions.get(alert.alertStat);
        alertMenuOptions.push({
            label: `${alert.alertDisabled ? "❌" : "✅"} ${fancyStat.charAt(0).toUpperCase() + fancyStat.substring(1)} of ${(await idToApiData(alert.alertToken)).name}`,
            description: (alert.alertDirection == "<" ? "Less than " : "Greater than ") + (alert.alertStat == "price" ? "$" : "") + alert.alertThreshold + (alert.alertStat.endsWith("%") ? "%" : ""),
            value: `${alert.alertToken}_${alert.alertStat}_${alert.alertThreshold}_${alert.alertDirection}_${alert.alertDisabled}`
        });
    }
    alertMenuOptions.sort((a, b) => a.label.localeCompare(b.label));
    return new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(new StringSelectMenuBuilder()
            .setCustomId(`alerts_menu_${interaction.user.id}`)
            .setMinValues(1)
            .setMaxValues(alertMenuOptions.length)
            .setPlaceholder("Select one or more alerts...")
            .setOptions(alertMenuOptions.length > 0 ? alertMenuOptions : [{
                label: "You have no alerts.",
                value: "default"
            }]));
}

export async function makeEmbed(values: string[], client: Client) {
    const instructions = getEmbedTemplate(client)
        .setTitle("Your alerts");
    let desc = "Toggle/delete your crypto notifications here. Disabled notifications are marked with an ❌ and enabled notifications are marked with a ✅.";
    const choices: string[] = [];
    for (const value of values) {
        const tokens = value.split("_");
        const alert = new UserSetting();
        alert.alertToken = Number(tokens[0]);
        alert.alertStat = tokens[1];
        alert.alertThreshold = Number(tokens[2]);
        alert.alertDirection = tokens[3];
        alert.alertDisabled = Number(tokens[4]);
        alert.id = tokens[5];
        const fancyStat = whatOptions.get(alert.alertStat);
        choices.push(`${alert.alertDisabled ? "❌" : "✅"} When ${fancyStat} of ${(await idToApiData(alert.alertToken)).name} is ${alert.alertDirection == "<" ? "less than" : "greater than"} ${(alert.alertStat == "price" ? "$" : "") + alert.alertThreshold + (alert.alertStat.endsWith("%") ? "%" : "")}`);
    }
    choices.sort();
    if (choices.length > 0) {
        desc += "\n\n **Selected:**";
    }
    for (const val of choices) {
        const addition = "\n- " + val;
        if (desc.length + addition.length > 4096) {
            desc += "...";
            break;
        }
        desc += addition;
    }
    instructions.setDescription(desc);
    return instructions;
}

export function makeButtons(interaction: BaseInteraction) {
    return new ActionRowBuilder<ButtonBuilder>()
        .addComponents(new ButtonBuilder()
            .setCustomId(`alerts_enable_${interaction.user.id}`)
            .setLabel("Enable selected")
            .setStyle(ButtonStyle.Success))
        .addComponents(new ButtonBuilder()
            .setCustomId(`alerts_disable_${interaction.user.id}`)
            .setLabel("Disable selected")
            .setStyle(ButtonStyle.Secondary))
        .addComponents(new ButtonBuilder()
            .setCustomId(`alerts_delete_${interaction.user.id}`)
            .setLabel("Delete selected")
            .setStyle(ButtonStyle.Danger));
}