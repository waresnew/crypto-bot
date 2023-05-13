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
import {DmCoinAlerts, DmGasAlerts, GuildCoinAlerts, GuildGasAlerts} from "../../utils/database";
import {commandIds} from "../../utils/discordUtils";
import {formatAlert, getAlertDb, makeAlertSelectEntry} from "../../utils/alertUtils";
import {GasAlert} from "../../structs/alert/gasAlert";

export async function makeAlertsMenu(interaction: APIInteraction, guild = false) {
    const prefix = guild ? "serveralerts" : "myalerts";
    let alerts;
    if (!guild) {
        alerts = [...await DmCoinAlerts.find({user: interaction.user.id}).toArray(), ...await DmGasAlerts.find({user: interaction.user.id}).toArray()];
    } else {
        alerts = [...await GuildCoinAlerts.find({guild: interaction.guild_id}).toArray(), ...await GuildGasAlerts.find({guild: interaction.guild_id}).toArray()];
    }
    const alertMenuOptions: APISelectMenuOption[] = alerts.map(alert => makeAlertSelectEntry(alert));
    alertMenuOptions.sort((a, b) => a.label.localeCompare(b.label));
    return {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.StringSelect,
                custom_id: `${prefix}_menu`,
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

export async function makeEmbed(values: (CoinAlert | GasAlert)[], interaction: APIInteraction, guild = false) {
    const instructions = getEmbedTemplate();
    instructions.title = guild ? "This server's alerts" : "Your alerts";
    let desc = guild ? `**You are currently managing this server's alerts. If you wish to manage your personal alerts, please run </myalerts:${commandIds.get("myalerts")}> instead.**\n\n` : "" + "Looking to add an alert? Run </coinalert:" + commandIds.get("coinalert") + ">!\nToggle/delete your crypto notifications here. Disabled notifications will not be triggered and are marked with an ❌. Enabled notifications are marked with a ✅.";
    const choices: string[] = [];
    let removed = "\n\nThe following alerts no longer exist. They will not be processed.\n";
    for (const alert of values) {
        const disabled = alert.disabled;
        delete alert.disabled;
        const noExist = await getAlertDb(alert).findOne(alert) == null;
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

export function makeButtons(guild = false) {
    const prefix = guild ? "serveralerts" : "myalerts";
    return {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                custom_id: `${prefix}_enable`,
                label: "Enable selected",
                emoji: {
                    id: null,
                    name: "▶️"
                },
                style: ButtonStyle.Success
            },
            {
                type: ComponentType.Button,
                custom_id: `${prefix}_disable`,
                label: "Disable selected",
                emoji: {
                    id: null,
                    name: "⏸️"
                },
                style: ButtonStyle.Secondary
            },
            {
                type: ComponentType.Button,
                custom_id: `${prefix}_delete`,
                label: "Delete selected",
                emoji: {
                    id: null,
                    name: "🗑️"
                },
                style: ButtonStyle.Danger
            },
            {
                type: ComponentType.Button,
                custom_id: `${prefix}_refresh`,
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

