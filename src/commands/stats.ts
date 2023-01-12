import {db} from "../database.js";
import {getEmbedTemplate} from "../ui/templates.js";
import {APIApplicationCommand, InteractionResponseType} from "discord-api-types/v10.js";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput.js";
import {FastifyReply} from "fastify";
import {startTime} from "../utils.js";

export default <APIApplicationCommand>{
    name: "stats",
    description: "List bot stats",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        const embed = getEmbedTemplate();
        embed.title = "Global statistics";
        embed.fields = [{
            name: "Server Count",
            value: "interaction.client.guilds.cache.size.toString()" //todo fix
        },
            {
                name: "Total Commands Ran",
                value: (await db.get("select commands_run_ever from global_stats")).commands_run_ever.toString()
            },
            {
                name: "Uptime",
                value: formatTime(Date.now() - startTime)
            }];
        await http.send({type: InteractionResponseType.ChannelMessageWithSource, data: {embeds: [embed]}});
    }
};

function formatTime(milliseconds: number) {
    const days = Math.floor(milliseconds / 86400000);
    const hours = Math.floor(milliseconds % 86400000 / 3600000);
    const minutes = Math.floor(milliseconds % 86400000 % 3600000 / 60000);
    const seconds = Math.floor(milliseconds % 86400000 % 3600000 % 60000 / 1000);
    return `${days} ${days != 1 ? "days" : "day"}, ${hours} ${hours != 1 ? "hours" : "hour"}, ${minutes} ${minutes != 1 ? "minutes" : "minute"}, ${seconds} ${seconds != 1 ? "seconds" : "second"}`;
}