import {APIApplicationCommand, ApplicationCommandType, InteractionResponseType} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {CoinAlerts, GasAlerts} from "../../utils/database";

export default {
    name: "dev",
    type: ApplicationCommandType.ChatInput,
    description: "Run test commands",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        const coinAlerts = await CoinAlerts.find({}).toArray();
        for (const alert of coinAlerts) {
            await CoinAlerts.updateOne({_id: alert._id}, {
                $set: {
                    threshold: alert.threshold.toString()
                }
            });
        }
        const gasAlerts = await GasAlerts.find({}).toArray();
        for (const alert of gasAlerts) {
            await GasAlerts.updateOne({_id: alert._id}, {
                $set: {
                    threshold: alert.threshold.toString()
                }
            });
        }
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {content: "ok"}
        });
    }
} as APIApplicationCommand;

