import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {
    APIApplicationCommand,
    APIInteractionResponse,
    ApplicationCommandType,
    InteractionResponseType
} from "discord-api-types/v10";
import {availableSettings, renderSetting} from "../ui/serversettings/interfaceCreator";

export default {
    name: "serversettings",
    type: ApplicationCommandType.ChatInput,
    description: "Adjust server-specific settings",
    guildOnly: true,
    manageServerRequired: true,
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: await renderSetting(interaction, availableSettings[0].dbKey)
        } as APIInteractionResponse);
    }
} as APIApplicationCommand;
