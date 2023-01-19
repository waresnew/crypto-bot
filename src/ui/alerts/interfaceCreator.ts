import {UserSetting, UserSettingType} from "../../structs/usersettings";
import {db, idToApiData} from "../../database";
import {getEmbedTemplate} from "../templates";
import CryptoStat from "../../structs/cryptoStat";
import {
    APIActionRowComponent,
    APIButtonComponent,
    APIInteraction,
    APISelectMenuOption,
    ButtonStyle,
    ComponentType
} from "discord-api-types/v10";
import {APIStringSelectComponent} from "discord-api-types/payloads/v10/channel";

export async function makeAlertsMenu(interaction: APIInteraction) {
    const alerts: UserSetting[] = [];
    const alertMenuOptions: APISelectMenuOption[] = [];
    await db.each("select alertToken,alertStat,alertThreshold,alertDirection,alertDisabled from user_settings where type=? and id=?", UserSettingType[UserSettingType.ALERT], interaction.user.id, (err, row) => {
        if (err) {
            throw err;
        }
        alerts.push(row as UserSetting);
    });
    for (const alert of alerts) {
        const fancyStat = CryptoStat.shortToLong(alert.alertStat);
        alertMenuOptions.push({
            label: `${alert.alertDisabled ? "❌" : "✅"} ${fancyStat.charAt(0).toUpperCase() + fancyStat.substring(1)} of ${(await idToApiData(alert.alertToken)).name}`,
            description: (alert.alertDirection == "<" ? "Less than " : "Greater than ") + (alert.alertStat == "price" ? "$" : "") + alert.alertThreshold + (alert.alertStat.endsWith("%") ? "%" : ""),
            value: `${alert.alertToken}_${alert.alertStat}_${alert.alertThreshold}_${alert.alertDirection}_${alert.alertDisabled}`
        });
    }
    alertMenuOptions.sort((a, b) => a.label.localeCompare(b.label));
    return {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.StringSelect,
                custom_id: `alerts_menu_${interaction.user.id}`,
                min_values: 1,
                max_values: alertMenuOptions.length == 0 ? 1 : alertMenuOptions.length,
                placeholder: "Select one or more alerts...",
                options: alertMenuOptions.length > 0 ? alertMenuOptions : [{
                    label: "You have no alerts.",
                    value: "default"
                }]
            }
        ]
    } as APIActionRowComponent<APIStringSelectComponent>;

}

export function parseAlertId(id: string) {
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

export async function makeEmbed(values: string[] | UserSetting[], interaction: APIInteraction) {
    const instructions = getEmbedTemplate();
    instructions.title = "Your alerts";
    let desc = "Toggle/delete your crypto notifications here. Disabled notifications are marked with an ❌ and enabled notifications are marked with a ✅.";
    const choices: string[] = [];
    let removed = "\n\nThe following alerts no longer exist. They will not be processed.\n";
    for (const value of values) {
        let alert = new UserSetting();
        if (values.length > 0 && typeof values[0] == "string") {
            alert = parseAlertId(value as string);
        } else {
            alert = value as UserSetting;
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
    for (const val of choices) {
        const addition = "\n- " + val;
        if (desc.length + addition.length > 4096) {
            desc += "...";
            break;
        }
        desc += addition;
    }
    instructions.description = desc;
    return instructions;
}

export function makeButtons(interaction: APIInteraction) {
    return {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                custom_id: `alerts_enable_${interaction.user.id}`,
                label: "Enable selected",
                style: ButtonStyle.Success
            },
            {
                type: ComponentType.Button,
                custom_id: `alerts_disable_${interaction.user.id}`,
                label: "Disable selected",
                style: ButtonStyle.Secondary
            },
            {
                type: ComponentType.Button,
                custom_id: `alerts_delete_${interaction.user.id}`,
                label: "Delete selected",
                style: ButtonStyle.Danger
            }
        ]
    } as APIActionRowComponent<APIButtonComponent>;
}

export async function formatAlert(alert: UserSetting) {
    const fancyStat = CryptoStat.shortToLong(alert.alertStat);
    return `When ${fancyStat} of ${(await idToApiData(alert.alertToken)).name} is ${alert.alertDirection == "<" ? "less than" : "greater than"} ${(alert.alertStat == "price" ? "$" : "") + alert.alertThreshold + (alert.alertStat.endsWith("%") ? "%" : "")}`;
}