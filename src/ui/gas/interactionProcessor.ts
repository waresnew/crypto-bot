/* istanbul ignore file */
import InteractionProcessor from "../abstractInteractionProcessor";
import {FastifyReply} from "fastify";
import {APIMessageComponentButtonInteraction, InteractionResponseType, MessageFlags} from "discord-api-types/v10";
import {analytics} from "../../utils/analytics";
import {etherscanLastUpdated} from "../../services/etherscanRest";
import {makeButtons, makeEmbed} from "./interfaceCreator";
import {validateRefresh} from "../../utils/discordUtils";

export default class GasInteractionProcessor extends InteractionProcessor {

    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply): Promise<void> {
        if (interaction.data.custom_id.startsWith("gas_refresh")) {
            try {
                validateRefresh(interaction, etherscanLastUpdated);
            } catch (e) {
                await http.send({
                    type: InteractionResponseType.ChannelMessageWithSource,
                    data: {
                        content: e,
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