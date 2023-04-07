/* istanbul ignore file */
import InteractionProcessor from "../abstractInteractionProcessor";
import {makeButtons, makeEmbed} from "./interfaceCreator";
import {APIMessageComponentButtonInteraction, InteractionResponseType, MessageFlags} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {analytics} from "../../analytics/segment";
import {idToMeta} from "../../structs/coinMetadata";
import {LatestCoins} from "../../database";
import {processing} from "../../services/coinApi";

export default class CoinInteractionProcessor extends InteractionProcessor {

    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply): Promise<void> {
        const coin = idToMeta(Number(interaction.data.custom_id.split("_")[2]));
        if (interaction.data.custom_id.startsWith("coin_refresh")) {
            const latestTime = Math.floor((await LatestCoins.findOne({coin: coin}, {sort: {open_time: -1}})).open_time / 1000);
            const curTime = Number(interaction.message.embeds[0].fields.find(field => field.name === "Last Updated").value.replaceAll("<t:", "").replaceAll(":R>", ""));
            if (latestTime == curTime) {
                analytics.track({
                    userId: interaction.user.id,
                    event: "Tried to refresh a coin that was already up to date",
                    properties: {
                        coin: coin.symbol
                    }
                });
                await http.send({
                    type: InteractionResponseType.ChannelMessageWithSource,
                    data: {
                        content: "This coin has not been updated since the last time you refreshed it.\nPlease try again in " + (processing ? 5 : Math.ceil(curTime / 60) * 60 - curTime) + " seconds.",
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }

            analytics.track({
                userId: interaction.user.id,
                event: "Refreshed a coin",
                properties: {
                    coin: coin.symbol
                }
            });
            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    components: [await makeButtons(idToMeta(Number(interaction.data.custom_id.split("_")[2])), interaction)],
                    embeds: [await makeEmbed(coin)]
                }
            });
        }
    }
}