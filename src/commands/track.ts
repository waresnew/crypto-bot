import {
    APIApplicationCommand,
    APIApplicationCommandAutocompleteInteraction,
    ApplicationCommandOptionType,
    ApplicationCommandType,
    InteractionResponseType
} from "discord-api-types/v10";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {FastifyReply} from "fastify";
import {makeStatPrompt} from "../ui/track/interfaceCreator";
import {autocompleteCoins, parseCoinCommandArg} from "../utils/coinUtils";

export default {
    name: "track",
    type: ApplicationCommandType.ChatInput,
    description: "Setup an alert for a cryptocurrency (interactive)",
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
        let coin;
        try {
            coin = await parseCoinCommandArg(interaction);
        } catch (e) {
            await http.send({
                type: InteractionResponseType.ChannelMessageWithSource, data: {
                    content: e
                }
            });
        }
        await http.send(makeStatPrompt(interaction, coin));
    },
    async autocomplete(interaction: APIApplicationCommandAutocompleteInteraction, http: FastifyReply) {
        await http.send(autocompleteCoins(interaction));
    }

} as APIApplicationCommand;
