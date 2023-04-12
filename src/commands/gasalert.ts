import {
    APIApplicationCommand,
    APIInteractionResponse,
    ApplicationCommandType,
    InteractionResponseType
} from "discord-api-types/v10";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {FastifyReply} from "fastify";

export default {
    name: "gasalert",
    type: ApplicationCommandType.ChatInput,
    description: "Setup an alert for ETH gas (interactive)",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                content: "This feature is currently under development."
            }
        } as APIInteractionResponse);
    }
} as APIApplicationCommand;