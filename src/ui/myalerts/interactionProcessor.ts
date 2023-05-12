import InteractionProcessor from "../abstractInteractionProcessor";
import {makeAlertsMenu, makeButtons, makeEmbed} from "./interfaceCreator";
import {
    APIInteraction,
    APIMessageComponentButtonInteraction,
    APIMessageComponentSelectMenuInteraction,
    ComponentType,
    InteractionResponseType,
    MessageFlags
} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {analytics} from "../../utils/analytics";
import {commandIds} from "../../utils/discordUtils";
import {getAlertDb, parseAlertId, parsePrettyAlert} from "../../utils/alertUtils";

export default class AlertsInteractionProcessor extends InteractionProcessor {
    /* istanbul ignore next */
    static override async processSelect(interaction: APIMessageComponentSelectMenuInteraction, http: FastifyReply) {
        if (interaction.data.component_type == ComponentType.StringSelect) {
            if (interaction.data.custom_id.startsWith("myalerts_menu")) {
                if (interaction.data.values[0] == "default") {
                    const coinLink = `</coin:${commandIds.get("coin")}>`;
                    await http.send({
                        type: InteractionResponseType.ChannelMessageWithSource, data: {
                            content: `Error: You have not added any alerts. Please use ${coinLink} on a coin and then click "Add alert" before proceeding.`,
                            flags: MessageFlags.Ephemeral
                        }
                    });
                    return;
                }
                const converted = await Promise.all(interaction.data.values.map(async value => await parseAlertId(value, interaction)));
                const instructions = await makeEmbed(converted, interaction);
                await http.send({
                    type: InteractionResponseType.UpdateMessage, data: {
                        embeds: [instructions],
                        components: [await makeAlertsMenu(interaction), await makeButtons()],
                        flags: MessageFlags.Ephemeral
                    }
                });
            }
        }
    }

    /* istanbul ignore next */
    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply) {
        const selected = await AlertsInteractionProcessor.parseSelected(interaction);
        if (selected.length == 0 && !interaction.data.custom_id.match(new RegExp("myalerts_refresh"))) {
            analytics.track({
                userId: interaction.user.id,
                event: "Performed batch operation with 0 selected",
                properties: {
                    type: interaction.data.custom_id
                }
            });
            await http.send({
                type: InteractionResponseType.ChannelMessageWithSource, data: {
                    content: "Error: You have not selected any alerts. Please select some alerts before proceeding.",
                    flags: MessageFlags.Ephemeral
                }
            });
            return;
        }
        if (interaction.data.custom_id.startsWith("myalerts_enable")) {
            analytics.track({
                userId: interaction.user.id,
                event: "Enabled selected alerts",
                properties: {
                    count: selected.length
                }
            });
            for (const alert of selected) {
                await getAlertDb(alert).updateOne(
                    alert,
                    {
                        $set: {
                            disabled: false
                        }
                    }
                );
                alert.disabled = false;

            }
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    embeds: [await makeEmbed(selected, interaction)],
                    components: [await makeAlertsMenu(interaction), await makeButtons()]
                }
            });
        } else if (interaction.data.custom_id.startsWith("myalerts_disable")) {
            analytics.track({
                userId: interaction.user.id,
                event: "Disabled selected alerts",
                properties: {
                    count: selected.length
                }
            });
            for (const alert of selected) {
                await getAlertDb(alert).updateOne(
                    alert,
                    {
                        $set: {
                            disabled: true
                        }
                    }
                );
                alert.disabled = true;
            }
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    embeds: [await makeEmbed(selected, interaction)],
                    components: [await makeAlertsMenu(interaction), await makeButtons()]
                }
            });
        } else if (interaction.data.custom_id.startsWith("myalerts_delete")) {
            analytics.track({
                userId: interaction.user.id,
                event: "Deleted selected alerts",
                properties: {
                    count: selected.length
                }
            });
            for (const alert of selected) {
                await getAlertDb(alert).deleteOne(alert);
            }
            selected.length = 0;
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    embeds: [await makeEmbed(selected, interaction)],
                    components: [await makeAlertsMenu(interaction), await makeButtons()]
                }
            });
        } else if (interaction.data.custom_id.startsWith("myalerts_refresh")) {
            analytics.track({
                userId: interaction.user.id,
                event: "Refreshed /myalerts page"
            });
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    components: [await makeAlertsMenu(interaction), makeButtons()],
                    embeds: [await makeEmbed(selected, interaction)],
                    flags: MessageFlags.Ephemeral
                }
            });
        }

    }

    /* istanbul ignore next */
    static async parseSelected(interaction: APIInteraction) {
        const selected = [];
        for (const line of interaction.message.embeds[0].description.split("\n")) {
            const result = parsePrettyAlert(line, interaction);
            if (result != null) {
                selected.push(result);
            }
        }
        return selected;
    }
}
