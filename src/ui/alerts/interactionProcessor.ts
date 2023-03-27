import InteractionProcessor from "../abstractInteractionProcessor";
import {makeAlertsMenu, makeButtons, makeEmbed} from "./interfaceCreator";
import CryptoStat from "../../structs/cryptoStat";
import {
    APIInteraction,
    APIMessageComponentButtonInteraction,
    APIMessageComponentSelectMenuInteraction,
    InteractionResponseType,
    MessageFlags
} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {commandIds} from "../../utils";
import {analytics} from "../../analytics/segment";
import {CoinAlert, CoinAlertModel} from "../../structs/coinAlert";
import {CmcLatestListingModel} from "../../structs/cmcLatestListing";

export default class AlertsInteractionProcessor extends InteractionProcessor {

    static override async processStringSelect(interaction: APIMessageComponentSelectMenuInteraction, http: FastifyReply) {
        if (interaction.data.custom_id.startsWith("alerts_menu")) {
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

            const instructions = await makeEmbed(interaction.data.values, interaction);
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    embeds: [instructions],
                    components: [await makeAlertsMenu(interaction), await makeButtons(interaction)],
                    flags: MessageFlags.Ephemeral
                }
            });
        }
    }

    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply) {
        const selected = await AlertsInteractionProcessor.parseSelected(interaction);
        if (selected.length == 0 && !interaction.data.custom_id.match(new RegExp("alerts_refresh"))) {
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
        if (interaction.data.custom_id.startsWith("alerts_enable")) {
            analytics.track({
                userId: interaction.user.id,
                event: "Enabled selected alerts",
                properties: {
                    count: selected.length
                }
            });
            for (const alert of selected) {
                alert.disabled = false;
                await CoinAlertModel.updateOne({
                    coin: alert.coin,
                    stat: alert.stat,
                    threshold: alert.threshold,
                    user: alert.user
                }, {disabled: false});

            }
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    embeds: [await makeEmbed(selected, interaction)],
                    components: [await makeAlertsMenu(interaction), await makeButtons(interaction)]
                }
            });
        } else if (interaction.data.custom_id.startsWith("alerts_disable")) {
            analytics.track({
                userId: interaction.user.id,
                event: "Disabled selected alerts",
                properties: {
                    count: selected.length
                }
            });
            for (const alert of selected) {
                alert.disabled = true;
                await CoinAlertModel.updateOne({
                    coin: alert.coin,
                    stat: alert.stat,
                    threshold: alert.threshold,
                    user: alert.user
                }, {disabled: true});
            }
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    embeds: [await makeEmbed(selected, interaction)],
                    components: [await makeAlertsMenu(interaction), await makeButtons(interaction)]
                }
            });
        } else if (interaction.data.custom_id.startsWith("alerts_delete")) {
            analytics.track({
                userId: interaction.user.id,
                event: "Deleted selected alerts",
                properties: {
                    count: selected.length
                }
            });
            for (const alert of selected) {
                await CoinAlertModel.deleteOne({
                    coin: alert.coin,
                    stat: alert.stat,
                    threshold: alert.threshold,
                    user: alert.user
                });
            }
            selected.length = 0;
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    embeds: [await makeEmbed(selected, interaction)],
                    components: [await makeAlertsMenu(interaction), await makeButtons(interaction)]
                }
            });
        } else if (interaction.data.custom_id.startsWith("alerts_refresh")) {
            analytics.track({
                userId: interaction.user.id,
                event: "Refreshed /alerts page"
            });
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    components: [await makeAlertsMenu(interaction), makeButtons(interaction)],
                    embeds: [await makeEmbed(selected, interaction)],
                    flags: MessageFlags.Ephemeral
                }
            });
        }

    }

    static async parseSelected(interaction: APIInteraction) {
        const selected: CoinAlert[] = [];
        for (const line of interaction.message.embeds[0].description.split("\n")) {
            const input = line.match(new RegExp(/- ([❌✅]) When (.+) of (.+) is (less|greater) than (.+)/));
            if (!input) {
                continue;
            }
            const alert = new CoinAlertModel();
            alert.user = interaction.user.id;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            alert.stat = CryptoStat.longToShort(CryptoStat.listLongs().find(k => k == input[2].toLowerCase()));
            alert.coin = (await CmcLatestListingModel.findOne({name: input[3]})).id;
            alert.threshold = Number(input[5].replace(new RegExp(/[$%]/), ""));
            alert.direction = input[4] == "less" ? "<" : ">";
            alert.disabled = input[1] == "❌";
            selected.push(alert);
        }
        return selected;
    }
}