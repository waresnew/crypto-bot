import {updateCmc} from "../../services/cmcApi";
import {APIApplicationCommand, InteractionResponseType} from "discord-api-types/v10";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {FastifyReply} from "fastify";

export default {
    name: "updatecmc",
    description: "Updates crypto data manually",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        await updateCmc();
        await http.send({type: InteractionResponseType.ChannelMessageWithSource, data: {content: "done"}});
    }
} as APIApplicationCommand;

