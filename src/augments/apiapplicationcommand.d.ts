import {APIApplicationCommandAutocompleteInteraction, APIInteraction} from "discord-api-types/v10";
import {FastifyReply} from "fastify";

declare module "discord-api-types/v10" {
    export interface APIApplicationCommand {
        execute(interaction: APIInteraction, http: FastifyReply);

        autocomplete(interaction: APIApplicationCommandAutocompleteInteraction, http: FastifyReply);
    }
}
