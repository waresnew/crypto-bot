import {APIApplicationCommand, ApplicationCommandType, InteractionResponseType} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";

export default {
    name: "dev",
    type: ApplicationCommandType.ChatInput,
    description: "Run test commands",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {content: await (await discordRequest("https://discord.com/api/v10/users/@me/guilds")).text()}
        });
    }
} as APIApplicationCommand;

