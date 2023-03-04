/* istanbul ignore file */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {FastifyReply} from "fastify";
import {
    APIMessageComponentButtonInteraction,
    APIMessageComponentSelectMenuInteraction,
    APIModalSubmitInteraction
} from "discord-api-types/v10";

export default abstract class InteractionProcessor {

    static processModal(_interaction: APIModalSubmitInteraction, _http: FastifyReply): Promise<void> {
        return undefined;
    }

    static processButton(_interaction: APIMessageComponentButtonInteraction, _http: FastifyReply): Promise<void> {
        return undefined;
    }

    static processStringSelect(_interaction: APIMessageComponentSelectMenuInteraction, _http: FastifyReply): Promise<void> {
        return undefined;
    }
}