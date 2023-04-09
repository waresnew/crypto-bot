/* istanbul ignore file */
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
import {CoinAlert} from "../../structs/coinAlert";
import {idToMeta} from "../../structs/coinMetadata";
import {CoinAlerts} from "../../database";
import {commandIds} from "../../utils";

export async function makeAlertsMenu(interaction: APIInteraction) {
    const alerts: CoinAlert[] = await CoinAlerts.find({user: interaction.user.id}).toArray();
    const alertMenuOptions: APISelectMenuOption[] = [];
    for (const alert of alerts) {
        const fancyStat = CryptoStat.shortToLong(alert.stat);
        alertMenuOptions.push({
            label: `${alert.disabled ? "❌" : "✅"} ${fancyStat.charAt(0).toUpperCase() + fancyStat.substring(1)} of ${idToMeta(alert.coin).name}`,
            description: (alert.direction == "<" ? "Less than " : "Greater than ") + (alert.stat == "price" ? "$" : "") + alert.threshold + (alert.stat.endsWith("%") ? "%" : ""),
            value: `${alert.coin}_${alert.stat}_${alert.threshold}_${alert.direction}_${alert.user}`
        });
    }
    alertMenuOptions.sort((a, b) => a.label.localeCompare(b.label));
    return {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.StringSelect,
                custom_id: "alerts_menu",
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

export async function parseAlertId(id: string) {
    const alert = new CoinAlert();
    const tokens = id.split("_");
    alert.coin = Number(tokens[0]);
    alert.stat = tokens[1];
    alert.threshold = Number(tokens[2]);
    alert.direction = tokens[3] as "<" | ">";
    alert.user = tokens[4];
    const old = await CoinAlerts.findOne({
        coin: alert.coin,
        stat: alert.stat,
        threshold: alert.threshold,
        direction: alert.direction,
        user: alert.user
    });
    if (!old) {
        alert.disabled = undefined;
    } else {
        alert.disabled = old["disabled"];
    }
    return alert;
}

export async function makeEmbed(values: string[] | CoinAlert[], interaction: APIInteraction) {
    const instructions = getEmbedTemplate();
    instructions.title = "Your alerts";
    let desc = "Looking to add an alert? Run </track:" + commandIds.get("track") + ">!\nToggle/delete your crypto notifications here. Disabled notifications will not be triggered and are marked with an ❌. Enabled notifications are marked with a ✅. If you only select one alert, you may directly edit it with the `Edit alert` button.";
    const choices: string[] = [];
    let removed = "\n\nThe following alerts no longer exist. They will not be processed.\n";
    for (const value of values) {
        let alert = new CoinAlert();
        if (values.length > 0 && typeof values[0] == "string") {
            alert = await parseAlertId(value as string);
        } else {
            alert = value as CoinAlert;
        }
        if (!alert || await CoinAlerts.findOne({
            coin: alert.coin,
            stat: alert.stat,
            threshold: alert.threshold,
            direction: alert.direction,
            user: alert.user
        }) == null) {
            removed += "\n- " + await formatAlert(alert);
        } else {
            choices.push(`${alert.disabled ? "❌" : "✅"} ${await formatAlert(alert)}`);
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
                custom_id: "alerts_enable",
                label: "Enable selected",
                emoji: {
                    id: null,
                    name: "▶️"
                },
                style: ButtonStyle.Success
            },
            {
                type: ComponentType.Button,
                custom_id: "alerts_disable",
                label: "Disable selected",
                emoji: {
                    id: null,
                    name: "⏸️"
                },
                style: ButtonStyle.Secondary
            },
            {
                type: ComponentType.Button,
                custom_id: "alerts_delete",
                label: "Delete selected",
                emoji: {
                    id: null,
                    name: "🗑️"
                },
                style: ButtonStyle.Danger
            },
            {
                type: ComponentType.Button,
                custom_id: "alerts_refresh",
                label: "Refresh",
                emoji: {
                    id: null,
                    name: "🔄"
                },
                style: ButtonStyle.Primary
            }
        ]
    } as APIActionRowComponent<APIButtonComponent>;
}

export async function formatAlert(alert: CoinAlert) {
    const fancyStat = CryptoStat.shortToLong(alert.stat);
    return `When ${fancyStat} of ${idToMeta(alert.coin).name} is ${alert.direction == "<" ? "less than" : "greater than"} ${(alert.stat == "price" ? "$" : "") + alert.threshold + (alert.stat.endsWith("%") ? "%" : "")}`;
}