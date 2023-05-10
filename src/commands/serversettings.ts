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
import {analytics} from "../utils/analytics";

export default {
    name: "serversettings",
    type: ApplicationCommandType.ChatInput,
    description: "Adjust server-specific settings",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        if (interaction.guild_id === undefined) {
            analytics.track({
                userId: interaction.user.id,
                event: "Attempted to use server cmd in DMs",
                properties: {
                    command: this.name
                }
            });
            await http.send({
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                    content: "This command can only be used in a server."
                }
            } as APIInteractionResponse);
        }
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                content: "Need help? Join the official Botchain server here: https://discord.gg/mpyPadCG3q"
            }
        } as APIInteractionResponse);
    }
} as APIApplicationCommand;
