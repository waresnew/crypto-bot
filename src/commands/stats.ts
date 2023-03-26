import {getEmbedTemplate} from "../ui/templates";
import {APIApplicationCommand, ApplicationCommandType, InteractionResponseType} from "discord-api-types/v10";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {FastifyReply} from "fastify";
import {discordGot, startTime} from "../utils";

export default {
    name: "stats",
    type: ApplicationCommandType.ChatInput,
    description: "List bot stats",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        const embed = getEmbedTemplate();
        embed.title = "Global statistics";
        embed.fields = [{
            name: "Server Count",
            value: await JSON.parse(await discordGot("users/@me/guilds").text()).length
        },
            {
                name: "Uptime",
                value: formatTime(Date.now() - startTime)
            }];
        await http.send({type: InteractionResponseType.ChannelMessageWithSource, data: {embeds: [embed]}});
    }
} as APIApplicationCommand;

function formatTime(milliseconds: number) {
    const days = Math.floor(milliseconds / 86400000);
    const hours = Math.floor(milliseconds % 86400000 / 3600000);
    const minutes = Math.floor(milliseconds % 86400000 % 3600000 / 60000);
    const seconds = Math.floor(milliseconds % 86400000 % 3600000 % 60000 / 1000);
    return `${days} ${days != 1 ? "days" : "day"}, ${hours} ${hours != 1 ? "hours" : "hour"}, ${minutes} ${minutes != 1 ? "minutes" : "minute"}, ${seconds} ${seconds != 1 ? "seconds" : "second"}`;
}