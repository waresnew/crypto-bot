/* istanbul ignore file */
import InteractionProcessor from "../abstractInteractionProcessor";
import {makeButtons, makeEmbed, makeFormData} from "./interfaceCreator";
import {APIMessageComponentButtonInteraction, InteractionResponseType, MessageFlags} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {analytics} from "../../utils/analytics";
import {idToMeta} from "../../structs/coinMetadata";
import {binanceLastUpdated} from "../../services/binanceRest";
import {Readable} from "node:stream";
import {validateRefresh} from "../../utils/discordUtils";
import {UserError} from "../../structs/userError";

export default class CoinInteractionProcessor extends InteractionProcessor {

    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply): Promise<void> {
        const coin = idToMeta(Number(interaction.data.custom_id.split("_")[2]));
        if (interaction.data.custom_id.startsWith("coin_refresh")) {
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
                event: "Refreshed a coin",
                properties: {
                    coin: coin.symbol
                }
            });
            const embed = await makeEmbed(coin);
            const buttons = makeButtons(coin);
            const encoded = await makeFormData({
                type: InteractionResponseType.UpdateMessage,
                data: {embeds: [embed], components: [buttons]}
            }, coin);
            await http.headers(encoded.headers).send(Readable.from(encoded.encode()));
        }
    }
}