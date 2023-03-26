import didyoumean from "didyoumean";
import {CmcLatestListingModel} from "../structs/cmcLatestListing";
import {cryptoNameList, cryptoSymbolList} from "../utils";
import {makeButtons, makeEmbed} from "../ui/coin/interfaceCreator";
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
import {
    APIApplicationCommandInteractionDataStringOption
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/_chatInput/string";

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
        const input = interaction.data.options?.find(option => option.name == "name");
        let coin: string;
        if (!input) {
            coin = "btc";
        } else {
            coin = (input as APIApplicationCommandInteractionDataStringOption).value;
        }
        const choice = await CmcLatestListingModel.findOne({$or: [{symbol: coin}, {name: coin}]}).collation({
            locale: "en",
            strength: 2
        });
        if (!choice) {
            const suggestion = didyoumean(coin.toLowerCase(), cryptoSymbolList.concat(cryptoNameList));
            await http.send({
                type: InteractionResponseType.ChannelMessageWithSource, data: {
                    content: `Couldn't find a coin called \`${coin}\`. ${suggestion != null
                        ? `Did you mean </coin:${interaction.data.id}> \`${suggestion}\`?`
                        : ""
                    }`
                }
            });
            return;
        }

        const embed = await makeEmbed(choice);
        const buttons = await makeButtons(choice, interaction);
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {embeds: [embed], components: [buttons]}
        });
    },
    async autocomplete(interaction: APIApplicationCommandAutocompleteInteraction, http: FastifyReply) {
        const focusedValue = (interaction.data.options.find(option => option.type == ApplicationCommandOptionType.String && option.focused) as APIApplicationCommandInteractionDataStringOption).value.toLowerCase();
        const filtered = cryptoSymbolList.filter(choice => choice.toLowerCase().startsWith(focusedValue));
        filtered.length = Math.min(filtered.length, 25);
        await http.send({
            type: InteractionResponseType.ApplicationCommandAutocompleteResult,
            data: {choices: filtered.map(choice => ({name: choice, value: choice}))}
        });
    }

} as APIApplicationCommand;
