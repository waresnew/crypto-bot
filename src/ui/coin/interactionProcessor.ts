/* istanbul ignore file */
import InteractionProcessor from "../abstractInteractionProcessor";
import {makeButtons, makeEmbed} from "./interfaceCreator";
import {APIMessageComponentButtonInteraction, InteractionResponseType} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {analytics} from "../../analytics/segment";
import {CmcLatestListingModel} from "../../structs/cmcLatestListing";

export default class CoinInteractionProcessor extends InteractionProcessor {

    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply): Promise<void> {
        const coin = await CmcLatestListingModel.findOne({id: interaction.data.custom_id.split("_")[2]});
        if (interaction.data.custom_id.startsWith("coin_refresh")) {
            analytics.track({
                userId: interaction.user.id,
                event: "Refreshed a coin",
                properties: {
                    coin: coin.symbol
                }
            });
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    components: [await makeButtons(await CmcLatestListingModel.findOne({id: interaction.data.custom_id.split("_")[2]}), interaction)],
                    embeds: [await makeEmbed(coin)]
                }
            });
        }
    }
}