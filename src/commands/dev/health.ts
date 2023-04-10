import {APIApplicationCommand, ApplicationCommandType, InteractionResponseType} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {getEmbedTemplate} from "../../ui/templates";

export default {
    name: "health",
    type: ApplicationCommandType.ChatInput,
    description: "Get bot health",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        const embed = getEmbedTemplate();
        embed.title = "Bot Health";
        embed.fields = [{
            name: "Ram usage",
            value: Math.floor(process.memoryUsage().heapUsed / 1000000) + "MB",
            inline: true
        }];
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {embeds: [embed]}
        });
    }
} as APIApplicationCommand;

