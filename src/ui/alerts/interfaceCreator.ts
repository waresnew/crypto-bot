/* istanbul ignore file */
import {getEmbedTemplate} from "../templates";
import {
    APIActionRowComponent,
    APIButtonComponent,
    APIInteraction,
    APISelectMenuOption,
    ButtonStyle,
    ComponentType
} from "discord-api-types/v10";
import {APIStringSelectComponent} from "discord-api-types/payloads/v10/channel";
import {CoinAlert} from "../../structs/alert/coinAlert";
import {CoinAlerts, GasAlerts} from "../../utils/database";
import {commandIds} from "../../utils/discordUtils";
import {formatAlert, makeAlertSelectEntry} from "../../utils/alertUtils";
import {GasAlert} from "../../structs/alert/gasAlert";

export async function makeAlertsMenu(interaction: APIInteraction) {
    const alerts = [...await CoinAlerts.find({user: interaction.user.id}).toArray(), ...await GasAlerts.find({user: interaction.user.id}).toArray()];
    const alertMenuOptions: APISelectMenuOption[] = alerts.map(alert => makeAlertSelectEntry(alert));
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

export async function makeEmbed(values: (CoinAlert | GasAlert)[], interaction: APIInteraction) {
    const instructions = getEmbedTemplate();
    instructions.title = "Your alerts";
    let desc = "Looking to add an alert? Run </track:" + commandIds.get("track") + ">!\nToggle/delete your crypto notifications here. Disabled notifications will not be triggered and are marked with an ❌. Enabled notifications are marked with a ✅.";
    const choices: string[] = [];
    let removed = "\n\nThe following alerts no longer exist. They will not be processed.\n";
    for (const alert of values) {
        const disabled = alert.disabled;
        delete alert.disabled;
        const noExist = await CoinAlerts.findOne(alert) == null;
        alert.disabled = disabled;
        if (noExist) {
            removed += "\n- " + formatAlert(alert);
        } else {
            choices.push(`${alert.disabled ? "❌" : "✅"} ${formatAlert(alert)}`);
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

export function makeButtons() {
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

