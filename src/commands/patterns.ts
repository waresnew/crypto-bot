import {APIApplicationCommand, ApplicationCommandType, InteractionResponseType} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";

export default {
    name: "patterns",
    type: ApplicationCommandType.ChatInput,
    description: "Finds candlestick patterns for a coin",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {

        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {content: "This command is not yet implemented"}
        });
    }
} as APIApplicationCommand;

