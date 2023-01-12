import {getEmbedTemplate} from "../ui/templates.js";
import {APIApplicationCommand, InteractionResponseType} from "discord-api-types/v10.js";
import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput.js";

export default <APIApplicationCommand>{
    name: "ping",
    description: "Gets bot latency",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        const embed = getEmbedTemplate();
        embed.title = "Pong!";
        embed.fields = [{
            name: "API Latency ⌛",
            value: "Pinging..."
        }];
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {embeds: [embed]}
        });
    }
};
