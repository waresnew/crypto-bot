import {APIApplicationCommand, ApplicationCommandType} from "discord-api-types/v10";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {FastifyReply} from "fastify";
import {makeSpeedPrompt} from "../ui/gasalert/interfaceCreator";

export default {
    name: "gasalert",
    type: ApplicationCommandType.ChatInput,
    description: "Setup an alert for ETH gas (interactive)",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        await http.send(makeSpeedPrompt());
    }
} as APIApplicationCommand;