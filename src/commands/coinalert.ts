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
import {makeGuildDmPrompt, makeStatPrompt} from "../ui/coinalert/interfaceCreator";
import {autocompleteCoins, parseCoinCommandArg} from "../utils/coinUtils";
import {UserError} from "../structs/userError";

export default {
    name: "coinalert",
    type: ApplicationCommandType.ChatInput,
    description: "Setup an alert for a coin (interactive)",
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
            if (e instanceof UserError) {
                await http.send({
                    type: InteractionResponseType.ChannelMessageWithSource, data: {
                        content: e.error
                    }
                });
            } else {
                throw e;
            }
        }
        if (interaction.guild_id) {
            await http.send(await makeGuildDmPrompt(interaction, coin));
        } else {
            await http.send(makeStatPrompt(interaction, coin, "dm", null));
        }
    },
    async autocomplete(interaction: APIApplicationCommandAutocompleteInteraction, http: FastifyReply) {
        await http.send(autocompleteCoins(interaction));
    }

} as APIApplicationCommand;
