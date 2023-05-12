import {APIApplicationCommand, ApplicationCommandType, InteractionResponseType} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {DmCoinAlerts, DmGasAlerts} from "../../utils/database";

export default {
    name: "dev",
    type: ApplicationCommandType.ChatInput,
    description: "Run test commands",
    async execute(interaction: APIChatInputApplicationCommandInteraction, http: FastifyReply) {
        const coinAlerts = await DmCoinAlerts.find({}).toArray();
        for (const alert of coinAlerts) {
            if (alert.guild == undefined) {
                await DmCoinAlerts.updateOne({_id: alert._id}, {
                    $set: {
                        guild: false
                    }
                });
            }
        }
        const gasAlerts = await DmGasAlerts.find({}).toArray();
        for (const alert of gasAlerts) {
            if (alert.guild == undefined) {
                await DmGasAlerts.updateOne({_id: alert._id}, {
                    $set: {
                        guild: false
                    }
                });
            }
        }
        await http.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {content: "ok"}
        });
    }
} as APIApplicationCommand;

