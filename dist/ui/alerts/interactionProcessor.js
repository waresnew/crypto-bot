import InteractionProcessor from "../abstractInteractionProcessor.js";
import { UserSetting } from "../../structs/usersettings.js";
import { whatOptions } from "../../utils.js";
import { db } from "../../database.js";
import { makeEmbed } from "./interfaceCreator.js";
export default class AlertsInteractionProcessor extends InteractionProcessor {
    static async processStringSelect(interaction) {
        if (interaction.customId.startsWith("alerts_menu")) {
            const instructions = await makeEmbed(interaction.values, interaction.client);
            await interaction.update({ embeds: [instructions], components: interaction.message.components });
        }
    }
    static async processButton(interaction) {
        const selected = await AlertsInteractionProcessor.parseSelected(interaction);
        if (interaction.customId.startsWith("alerts_enable")) {
            for (const alert of selected) {
                alert.alertDisabled = "0";
                await db.run("update user_settings set alertDisabled=0 where id=? and alertToken=? and alertStat=? and alertThreshold=? and alertDirection=?", interaction.user.id, alert.alertToken, alert.alertStat, alert.alertThreshold, alert.alertDirection);
            }
        }
        else if (interaction.customId.startsWith("alerts_disable")) {
        }
        else if (interaction.customId.startsWith(" ")) {
        }
    }
    static async parseSelected(interaction) {
        const selected = [];
        for (const line of interaction.message.embeds[0].description.split("\n")) {
            const input = line.match(new RegExp("- ([❌✅]) When (.+) of (.+) is (less|greater) than (.+)"));
            const setting = new UserSetting();
            setting.id = interaction.user.id;
            setting.alertStat = [...whatOptions].find(([_k, v]) => v == input[1])[0];
            setting.alertToken = (await db.get("select id from cmc_cache where name=?", input[2])).id;
            setting.alertThreshold = Number(input[4].replace(new RegExp("[$%]"), ""));
            setting.alertDirection = input[3] == "less" ? "<" : ">";
            setting.alertDisabled = input[0] == "❌" ? 1 : 0;
            selected.push(setting);
        }
        return selected;
    }
}
//# sourceMappingURL=interactionProcessor.js.map