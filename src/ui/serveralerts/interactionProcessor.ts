import InteractionProcessor from "../abstractInteractionProcessor";
import {
    APIMessageComponentButtonInteraction,
    APIMessageComponentSelectMenuInteraction,
    InteractionResponseType,
    MessageFlags
} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import MyAlertsInteractionProcessor from "../myalerts/interactionProcessor";
import {checkAlertCreatePerm} from "../../utils/discordUtils";
import {UserError} from "../../structs/userError";

export default class ServerAlertsInteractionProcessor extends InteractionProcessor {
    static override async processSelect(interaction: APIMessageComponentSelectMenuInteraction, http: FastifyReply) {
        await MyAlertsInteractionProcessor.processSelect(interaction, http, true);
    }

    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply) {
        try {
            await checkAlertCreatePerm(interaction);
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
        await MyAlertsInteractionProcessor.processButton(interaction, http, true);
    }
}