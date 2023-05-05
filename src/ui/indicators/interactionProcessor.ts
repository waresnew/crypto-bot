/* istanbul ignore file */
import InteractionProcessor from "../abstractInteractionProcessor";
import {APIMessageComponentButtonInteraction, InteractionResponseType, MessageFlags} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {idToMeta} from "../../structs/coinMetadata";
import {binanceLastUpdated} from "../../services/binanceRest";
import {analytics} from "../../utils/analytics";
import {validateRefresh} from "../../utils/discordUtils";
import {makeButtons, makeEmbed} from "./interfaceCreator";
import {UserError} from "../../structs/userError";

export default class IndicatorsInteractionProcessor extends InteractionProcessor {
    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply): Promise<void> {
        const coin = idToMeta(Number(interaction.data.custom_id.split("_")[2]));
        if (interaction.data.custom_id.startsWith("indicators_refresh")) {
            try {
                validateRefresh(interaction, binanceLastUpdated);
            } catch (e) {
                if (e instanceof UserError) {
                    await http.send({
                        type: InteractionResponseType.ChannelMessageWithSource,
                        data: {
                            content: e.error,
                            flags: MessageFlags.Ephemeral
                        }
                    });
                    return;
                } else {
                    throw e;
                }
            }

            analytics.track({
                userId: interaction.user.id,
                event: "Refreshed indicators",
                properties: {
                    coin: coin.symbol
                }
            });
            const embed = await makeEmbed(coin);
            const buttons = await makeButtons(coin);
            await http.send({
                type: InteractionResponseType.UpdateMessage,
                data: {embeds: [embed], components: [buttons]}
            });
        }
    }
}