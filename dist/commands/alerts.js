import { SlashCommandBuilder } from "discord.js";
import { db } from "../database.js";
import { UserSettingType } from "../structs/usersettings.js";
import { getEmbedTemplate } from "../ui/templates.js";
export default {
    data: new SlashCommandBuilder().setName("alerts").setDescription("Manage your alerts"),
    async execute(interaction) {
        const alerts = [];
        await db.each("select alertToken,alertStat,alertThreshold from user_settings where type=? and id=?", UserSettingType[UserSettingType.ALERT], interaction.user.id, (err, row) => {
            if (err) {
                throw err;
            }
            alerts.push(row);
        });
        const instructions = getEmbedTemplate(interaction.client);
    }
};
//# sourceMappingURL=alerts.js.map