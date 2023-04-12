/* istanbul ignore file */
import InteractionProcessor from "../abstractInteractionProcessor";
import {FastifyReply} from "fastify";
import {APIMessageComponentButtonInteraction, InteractionResponseType, MessageFlags} from "discord-api-types/v10";
import {analytics} from "../../utils/analytics";
import {etherscanLastUpdated} from "../../services/etherscanRest";
import {makeButtons, makeEmbed} from "./interfaceCreator";

export default class GasInteractionProcessor extends InteractionProcessor {

    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply): Promise<void> {
        if (interaction.data.custom_id.startsWith("gas_refresh")) {
            const latestTime = Math.floor(etherscanLastUpdated / 1000);
            const curTime = Number(interaction.message.embeds[0].fields.find(field => field.name === "Last Updated").value.replaceAll("<t:", "").replaceAll(":R>", ""));
            if (latestTime == curTime) {
                analytics.track({
                    userId: interaction.user.id,
                    event: "Tried to refresh gas prices that was already up to date"
                });
                await http.send({
                    type: InteractionResponseType.ChannelMessageWithSource,
                    data: {
                        content: "The gas prices have not been updated since the last time you refreshed it.\nPlease try again <t:" + Math.round(Math.ceil(Date.now() / 1000 / 60) * 60) + ":R>.",
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }

            analytics.track({
                userId: interaction.user.id,
                event: "Refreshed gas prices"
            });
            await http.send({
                type: InteractionResponseType.UpdateMessage,
                data: {
                    embeds: [makeEmbed()],
                    components: [makeButtons()]
                }
            });
        }
    }
}