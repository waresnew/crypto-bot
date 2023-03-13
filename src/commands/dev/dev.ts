import {APIApplicationCommand, ApplicationCommandType, InteractionResponseType} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import discordRequest from "../../requests";

export default {
    name: "dev",
    type: ApplicationCommandType.ChatInput,
    description: "Run test commands",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        const result = JSON.parse(await (await discordRequest("https://discord.com/api/v10/users/@me/guilds")).text());
        const mapped = result.map((a: { name: string; }) => a.name);
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {content: mapped.join(", ")}
        });
    }
} as APIApplicationCommand;

