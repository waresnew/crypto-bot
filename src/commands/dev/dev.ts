import {APIApplicationCommand, ApplicationCommandType, InteractionResponseType} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {makeChart} from "../../ui/coin/interfaceCreator";

export default {
    name: "dev",
    type: ApplicationCommandType.ChatInput,
    description: "Run test commands",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        const start = Date.now();
        for (let i = 0; i < 10; i++) {
            await makeChart({
                symbol: "BTC",
                cmc_id: 1,
                name: "Bitcoin",
                slug: "bitcoin"
            });
        }
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {content: `Took ${Date.now() - start} ms`}
        });
    }
} as APIApplicationCommand;

