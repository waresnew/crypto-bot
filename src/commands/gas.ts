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
import {makeButtons, makeEmbed} from "../ui/gas/interfaceCreator";

export default {
    name: "gas",
    type: ApplicationCommandType.ChatInput,
    description: "Get the current ETH gas price",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                embeds: [makeEmbed()],
                components: [makeButtons()]
            }
        } as APIInteractionResponse);
    }
} as APIApplicationCommand;