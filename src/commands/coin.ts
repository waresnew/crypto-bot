import {makeButtons, makeEmbed, makeFormData} from "../ui/coin/interfaceCreator";
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
import {Readable} from "node:stream";
import {autocompleteCoins, parseCoinCommandArg} from "../utils/coinUtils";

export default {
    name: "coin",
    type: ApplicationCommandType.ChatInput,
    description: "Gets information about a cryptocurrency",
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
        const embed = await makeEmbed(choice);
        const buttons = await makeButtons(choice);
        const encoded = await makeFormData({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {embeds: [embed], components: [buttons]}
        }, choice);
        await http.headers(encoded.headers).send(Readable.from(encoded.encode()));
    },
    async autocomplete(interaction: APIApplicationCommandAutocompleteInteraction, http: FastifyReply) {
        await http.send(autocompleteCoins(interaction));
    }

} as APIApplicationCommand;
