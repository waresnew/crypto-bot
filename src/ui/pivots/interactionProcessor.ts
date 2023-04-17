/* istanbul ignore file */
import InteractionProcessor from "../abstractInteractionProcessor";
import {APIMessageComponentButtonInteraction, InteractionResponseType, MessageFlags} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {idToMeta} from "../../structs/coinMetadata";
import {validateRefresh} from "../../utils/discordUtils";
import {analytics} from "../../utils/analytics";
import {makeButtons, makeEmbed} from "./interfaceCreator";

export default class PivotsInteractionProcessor extends InteractionProcessor {
    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply): Promise<void> {
        const coin = idToMeta(Number(interaction.data.custom_id.split("_")[2]));
        if (interaction.data.custom_id.startsWith("pivots_refresh")) {
            try {
                validateRefresh(interaction, Math.floor(Date.now() / 86400000) * 86400000, 86400);
            } catch (e) {
                await http.send({
                    type: InteractionResponseType.ChannelMessageWithSource,
                    data: {
                        content: e + "\nPivot points are calculated using the previous day's data, so they are only updated once a day.",
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }

            analytics.track({
                userId: interaction.user.id,
                event: "Refreshed pivots",
                properties: {
                    coin: coin.symbol
                }
            });
            const embed = await makeEmbed(coin, interaction);
            const buttons = await makeButtons(coin);
            await http.send({
                type: InteractionResponseType.UpdateMessage,
                data: {embeds: [embed], components: [buttons]}
            });
        }
    }
}