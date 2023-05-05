import {
    APIApplicationCommand,
    APIApplicationCommandAutocompleteInteraction,
    ApplicationCommandOptionType,
    ApplicationCommandType,
    InteractionResponseType,
    MessageFlags
} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {makeButtons, makeEmbed} from "../ui/pivots/interfaceCreator";
import {autocompleteCoins, parseCoinCommandArg} from "../utils/coinUtils";
// noinspection DuplicatedCode
export default {
    name: "pivots",
    type: ApplicationCommandType.ChatInput,
    description: "Calculate pivot points for a coin",
    options: [
        {
            name: "name",
            type: ApplicationCommandOptionType.String,
            description: "The name/symbol of the coin",
            autocomplete: true,
            required: true
        }
    ],
    voteRequired: true,
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        let choice;
        try {
            choice = await parseCoinCommandArg(interaction);
        } catch (e) {
            await http.send({
                type: InteractionResponseType.ChannelMessageWithSource, data: {
                    content: e
                }
            });
        }
        let embed;
        try {
            embed = await makeEmbed(choice, interaction);
        } catch (e) {
            await http.send({
                type: InteractionResponseType.ChannelMessageWithSource, data: {
                    embeds: [e]
                }
            });
            return;
        }
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                embeds: [embed],
                components: [makeButtons(choice)],
                flags: MessageFlags.Ephemeral
            }
        });
    },
    async autocomplete(interaction: APIApplicationCommandAutocompleteInteraction, http: FastifyReply) {
        await http.send(autocompleteCoins(interaction));
    }
} as APIApplicationCommand;

