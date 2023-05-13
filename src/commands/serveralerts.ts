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
import {makeAlertsMenu, makeButtons, makeEmbed} from "../ui/myalerts/interfaceCreator";

export default {
    name: "serveralerts",
    type: ApplicationCommandType.ChatInput,
    description: "Manage this server's alerts",
    guildOnly: true,
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        const instructions = await makeEmbed([], interaction, true);
        const actions = makeButtons(true);
        const menu = await makeAlertsMenu(interaction, true);
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {embeds: [instructions], components: [menu, actions], flags: MessageFlags.Ephemeral}
        });
    }
} as APIApplicationCommand;
