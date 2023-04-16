import {
    APIApplicationCommand,
    APIApplicationCommandAutocompleteInteraction,
    ApplicationCommandOptionType,
    ApplicationCommandType,
    InteractionResponseType
} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {autocompleteCoins, parseCoinCommandArg} from "../utils/coinUtils";
import {makeButtons, makeEmbed} from "../ui/indicators/interfaceCreator";

export default {
    name: "indicators",
    type: ApplicationCommandType.ChatInput,
    description: "Finds technical indicators for a coin",
    options: [
        {
            name: "name",
            type: ApplicationCommandOptionType.String,
            description: "The name/symbol of the coin",
            autocomplete: true,
            required: true
        }
    ],
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
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {embeds: [await makeEmbed(choice)], components: [makeButtons(choice)]}
        });
    },
    async autocomplete(interaction: APIApplicationCommandAutocompleteInteraction, http: FastifyReply) {
        await http.send(autocompleteCoins(interaction));
    }
} as APIApplicationCommand;

