import {makeAlertsMenu, makeButtons, makeEmbed} from "../ui/myalerts/interfaceCreator";
import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {
    APIApplicationCommand,
    ApplicationCommandType,
    InteractionResponseType,
    MessageFlags
} from "discord-api-types/v10";

export default {
    name: "myalerts",
    type: ApplicationCommandType.ChatInput,
    description: "Manage your alerts",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        const instructions = await makeEmbed([], interaction);
        const actions = makeButtons();
        const menu = await makeAlertsMenu(interaction);
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {embeds: [instructions], components: [menu, actions], flags: MessageFlags.Ephemeral}
        });
    }
} as APIApplicationCommand;
