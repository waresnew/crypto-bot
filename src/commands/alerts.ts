import {makeAlertsMenu, makeButtons, makeEmbed} from "../ui/alerts/interfaceCreator";
import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {APIApplicationCommand, ApplicationCommandType, InteractionResponseType} from "discord-api-types/v10";

export default {
    name: "alerts",
    type: ApplicationCommandType.ChatInput,
    description: "Manage your alerts",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        const instructions = await makeEmbed([], interaction);
        const actions = makeButtons([], interaction);
        const menu = await makeAlertsMenu(interaction);
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {embeds: [instructions], components: [menu, actions]}
        });
    }
} as APIApplicationCommand;
