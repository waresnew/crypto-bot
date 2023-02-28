import {
    APIApplicationCommand,
    APIInteraction,
    ApplicationCommandType,
    InteractionResponseType
} from "discord-api-types/v10";
import {FastifyReply} from "fastify";

export default {
    name: "settings",
    type: ApplicationCommandType.ChatInput,
    description: "View and change bot settings",
    async execute(interaction: APIInteraction, http: FastifyReply) {
        http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {content: "This command is not implemented yet."}
        });
    }
} as APIApplicationCommand;