import {db} from "../../database";
import {getEmbedTemplate} from "../../ui/templates";
import {APIApplicationCommand, ApplicationCommandOptionType, InteractionResponseType} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {
    APIApplicationCommandInteractionDataStringOption
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/_chatInput/string";

export default {
    name: "sql",
    description: "Evaluates SQL queries using the main database",
    options: [
        {
            name: "command",
            description: "The SQL command",
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        const command = (interaction.data.options.find(option => option.name == "command") as APIApplicationCommandInteractionDataStringOption).value;
        const embed = getEmbedTemplate();
        embed.title = "Result";
        try {
            let output = "";
            await db.each(command, (err, row) => {
                if (err) {
                    throw err;
                }
                output += JSON.stringify(row) + "\n";
            });
            embed.description = output;
        } catch (err) {
            embed.description = err.toString();
        }
        await http.send({type: InteractionResponseType.ChannelMessageWithSource, data: {embeds: [embed]}});
    }
} as APIApplicationCommand;
