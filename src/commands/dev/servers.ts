import {APIApplicationCommand, ApplicationCommandType, InteractionResponseType} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {discordGot} from "../../utils/discordUtils";

export default {
    name: "servers",
    type: ApplicationCommandType.ChatInput,
    description: "Lists names of servers",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        const result = JSON.parse(await discordGot("users/@me/guilds").text());
        const mapped = result.map((a: { name: string; }) => a.name);
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {content: mapped.join(", ")}
        });
    }
} as APIApplicationCommand;

