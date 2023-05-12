import InteractionProcessor from "../abstractInteractionProcessor";
import {FastifyReply} from "fastify";
import {
    APIMessageComponentSelectMenuInteraction,
    APIMessageRoleSelectInteractionData,
    ComponentType,
    InteractionResponseType
} from "discord-api-types/v10";
import {ServerSettings} from "../../utils/database";
import {availableSettings, renderSetting} from "./interfaceCreator";

export default class ServerSettingsInteractionProcessor extends InteractionProcessor {
    static override async processSelect(interaction: APIMessageComponentSelectMenuInteraction, http: FastifyReply) {
        if (interaction.data.component_type == ComponentType.RoleSelect) {
            const data = interaction.data as APIMessageRoleSelectInteractionData;
            const settings = await ServerSettings.findOne({guild: interaction.guild_id});
            const meta = availableSettings.find(s => s.dbKey === data.custom_id.split("_")[1]);
            if (meta.type !== "roleselect") {
                throw new Error("Invalid setting type: " + meta.type);
            }
            settings[meta.dbKey] = data.resolved.roles[Object.keys(data.resolved.roles)[0]].id;
            await ServerSettings.updateOne({
                guild: interaction.guild_id
            }, {
                $set: {
                    [meta.dbKey]: settings[meta.dbKey]
                }
            });
            await http.send({
                type: InteractionResponseType.UpdateMessage,
                data: await renderSetting(interaction, meta.dbKey)
            });
        }
    }
}