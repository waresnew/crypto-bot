import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {
    APIApplicationCommand,
    APIInteractionResponse,
    ApplicationCommandType,
    InteractionResponseType
} from "discord-api-types/v10";

export default {
    name: "server",
    type: ApplicationCommandType.ChatInput,
    description: "Get an invite to the Botchain support server!",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                content: "Need help? Join the official Botchain server here: https://discord.gg/mpyPadCG3q"
            }
        } as APIInteractionResponse);
    }
} as APIApplicationCommand;
