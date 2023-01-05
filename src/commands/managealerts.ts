import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { db } from "../database.js";
import { UserSetting } from "../structs/usersettings.js";

export default {
    data: new SlashCommandBuilder().setName("managealerts").setDescription("Manage your alerts"),
    async execute(interaction: ChatInputCommandInteraction) {
        let ans = "";
        await db.each("select * from user_settings where type=\"ALERT\"", (err, row) => {
            if (err) {
                throw err;
            }
            const notif = row as UserSetting;
            ans += `Token: ${notif.alertToken}, Stat: ${notif.alertStat}, Threshold: ${notif.alertThreshold}\n`;
        });
        interaction.reply(ans);
    }
};
