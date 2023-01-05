import { SlashCommandBuilder } from "discord.js";
import { db } from "../database.js";
export default {
    data: new SlashCommandBuilder().setName("managealerts").setDescription("Manage your alerts"),
    async execute(interaction) {
        let ans = "";
        await db.each("select * from user_settings where type=\"ALERT\"", (err, row) => {
            if (err) {
                throw err;
            }
            const notif = row;
            ans += `Token: ${notif.alertToken}, Stat: ${notif.alertStat}, Threshold: ${notif.alertThreshold}\n`;
        });
        interaction.reply(ans);
    }
};
//# sourceMappingURL=managealerts.js.map