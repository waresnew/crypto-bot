import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { db } from "../database.js";
import { UserSetting, UserSettingType } from "../structs/usersettings.js";
import { getEmbedTemplate } from "../ui/templates.js";

export default {
    data: new SlashCommandBuilder().setName("managealerts").setDescription("Manage your alerts"),
    async execute(interaction: ChatInputCommandInteraction) {
        const alerts = [];
        await db.each("select alertToken,alertStat,alertThreshold from user_settings where type=? and id=?", UserSettingType[UserSettingType.ALERT], interaction.user.id, (err, row) => {
            if (err) {
                throw err;
            }
            alerts.push(row as UserSetting);
        });
        const instructions = getEmbedTemplate(interaction.client);
    }
};
