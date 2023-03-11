import {APIApplicationCommand, ApplicationCommandType, InteractionResponseType} from "discord-api-types/v10";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {FastifyReply} from "fastify";

export default {
    name: "vote",
    type: ApplicationCommandType.ChatInput,
    description: "Support the bot!",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {content: "You can vote for the bot here: https://top.gg/bot/1058388231273590885/vote"}
        });
    }
} as APIApplicationCommand;