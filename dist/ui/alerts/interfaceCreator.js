import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";
import { UserSetting, UserSettingType } from "../../structs/usersettings.js";
import { db, idToApiData } from "../../database.js";
import { getEmbedTemplate } from "../templates.js";
import CryptoStat from "../../structs/cryptoStat.js";
export async function makeAlertsMenu(interaction) {
    const alerts = [];
    const alertMenuOptions = [];
    await db.each("select alertToken,alertStat,alertThreshold,alertDirection,alertDisabled from user_settings where type=? and id=?", UserSettingType[UserSettingType.ALERT], interaction.user.id, (err, row)=>{
        if (err) {
            throw err;
        }
        alerts.push(row);
    });
    for (const alert of alerts){
        const fancyStat = CryptoStat.shortToLong(alert.alertStat);
        alertMenuOptions.push({
            label: `${alert.alertDisabled ? "❌" : "✅"} ${fancyStat.charAt(0).toUpperCase() + fancyStat.substring(1)} of ${(await idToApiData(alert.alertToken)).name}`,
            description: (alert.alertDirection == "<" ? "Less than " : "Greater than ") + (alert.alertStat == "price" ? "$" : "") + alert.alertThreshold + (alert.alertStat.endsWith("%") ? "%" : ""),
            value: `${alert.alertToken}_${alert.alertStat}_${alert.alertThreshold}_${alert.alertDirection}_${alert.alertDisabled}`
        });
    }
    alertMenuOptions.sort((a, b)=>a.label.localeCompare(b.label));
    return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`alerts_menu_${interaction.user.id}`).setMinValues(1).setMaxValues(alertMenuOptions.length == 0 ? 1 : alertMenuOptions.length).setPlaceholder("Select one or more alerts...").setOptions(alertMenuOptions.length > 0 ? alertMenuOptions : [
        {
            label: "You have no alerts.",
            value: "default"
        }
    ]));
}
export function parseAlertId(id) {
    const alert = new UserSetting();
    const tokens = id.split("_");
    alert.alertToken = Number(tokens[0]);
    alert.alertStat = tokens[1];
    alert.alertThreshold = Number(tokens[2]);
    alert.alertDirection = tokens[3];
    alert.alertDisabled = Number(tokens[4]);
    alert.id = tokens[5];
    return alert;
}
export async function makeEmbed(values, interaction) {
    const instructions = getEmbedTemplate(interaction.client).setTitle("Your alerts");
    let desc = "Toggle/delete your crypto notifications here. Disabled notifications are marked with an ❌ and enabled notifications are marked with a ✅.";
    const choices = [];
    let removed = "\n\nThe following alerts no longer exist. They will not be processed.\n";
    for (const value of values){
        let alert = new UserSetting();
        if (values.length > 0 && typeof values[0] == "string") {
            alert = parseAlertId(value);
        } else {
            alert = value;
        }
        if (!Object.values(await db.get("select exists(select 1 from user_settings where id=? and type=? and alertToken=? and alertStat=? and alertThreshold=? and alertDirection=? and alertDisabled=?)", interaction.user.id, UserSettingType[UserSettingType.ALERT], alert.alertToken, alert.alertStat, alert.alertThreshold, alert.alertDirection, alert.alertDisabled))[0]) {
            removed += "\n- " + await formatAlert(alert);
        } else {
            choices.push(`${alert.alertDisabled ? "❌" : "✅"} ${await formatAlert(alert)}`);
        }
    }
    if (removed != "\n\nThe following alerts no longer exist. They will not be processed.\n") {
        desc += removed;
    }
    choices.sort();
    if (choices.length > 0) {
        desc += "\n\n **Selected:**";
    } else {
        desc += "\n\nYou currently have no selected alerts.";
    }
    for (const val of choices){
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
export function makeButtons(interaction) {
    return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`alerts_enable_${interaction.user.id}`).setLabel("Enable selected").setStyle(ButtonStyle.Success)).addComponents(new ButtonBuilder().setCustomId(`alerts_disable_${interaction.user.id}`).setLabel("Disable selected").setStyle(ButtonStyle.Secondary)).addComponents(new ButtonBuilder().setCustomId(`alerts_delete_${interaction.user.id}`).setLabel("Delete selected").setStyle(ButtonStyle.Danger));
}
export async function formatAlert(alert) {
    const fancyStat = CryptoStat.shortToLong(alert.alertStat);
    return `When ${fancyStat} of ${(await idToApiData(alert.alertToken)).name} is ${alert.alertDirection == "<" ? "less than" : "greater than"} ${(alert.alertStat == "price" ? "$" : "") + alert.alertThreshold + (alert.alertStat.endsWith("%") ? "%" : "")}`;
}

//# sourceMappingURL=interfaceCreator.js.map