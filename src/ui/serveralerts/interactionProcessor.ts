import InteractionProcessor from "../abstractInteractionProcessor";
import {APIMessageComponentButtonInteraction, APIMessageComponentSelectMenuInteraction} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import MyAlertsInteractionProcessor from "../myalerts/interactionProcessor";

export default class ServerAlertsInteractionProcessor extends InteractionProcessor {
    static override async processSelect(interaction: APIMessageComponentSelectMenuInteraction, http: FastifyReply) {
        await MyAlertsInteractionProcessor.processSelect(interaction, http, true);
    }

    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply) {
        await MyAlertsInteractionProcessor.processButton(interaction, http, true);
    }
}