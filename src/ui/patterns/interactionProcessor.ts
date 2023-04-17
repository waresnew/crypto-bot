/* istanbul ignore file */
import InteractionProcessor from "../abstractInteractionProcessor";
import {APIMessageComponentButtonInteraction, InteractionResponseType, MessageFlags} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {idToMeta} from "../../structs/coinMetadata";
import {validateOneMinuteRefresh} from "../../utils/discordUtils";
import {binanceLastUpdated} from "../../services/binanceRest";
import {analytics} from "../../utils/analytics";
import {makeButtons, makeEmbed} from "./interfaceCreator";

export default class PatternsInteractionProcessor extends InteractionProcessor {
    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply): Promise<void> {
        const coin = idToMeta(Number(interaction.data.custom_id.split("_")[2]));
        if (interaction.data.custom_id.startsWith("patterns_refresh")) {
            try {
                validateOneMinuteRefresh(interaction, binanceLastUpdated);
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
                event: "Refreshed patterns",
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