import {
    APIApplicationCommand,
    APIInteractionResponse,
    ApplicationCommandType,
    InteractionResponseType
} from "discord-api-types/v10";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {FastifyReply} from "fastify";
import {getEmbedTemplate} from "../ui/templates";
import {gasPrices} from "../services/etherscanRest";

export default {
    name: "gas",
    type: ApplicationCommandType.ChatInput,
    description: "Get the current ETH gas price",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                embeds: [{
                    ...getEmbedTemplate(),
                    title: "Ethereum Gas Prices",
                    thumbnail: {
                        url: "https://s2.coinmarketcap.com/static/img/coins/128x128/1027.png"
                    },
                    fields: [
                        {
                            name: "Slow 🐢",
                            value: gasPrices["slow"] + " gwei",
                            inline: true
                        },
                        {
                            name: "Normal 🚶",
                            value: gasPrices["normal"] + " gwei",
                            inline: true
                        },
                        {
                            name: "Fast ⚡",
                            value: gasPrices["fast"] + " gwei",
                            inline: true
                        }
                    ]
                }]
            }
        } as APIInteractionResponse);
    }
} as APIApplicationCommand;