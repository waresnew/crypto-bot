import InteractionProcessor from "../abstractInteractionProcessor.js";
import { chatInputApplicationCommandMention } from "discord.js";
import { UserSetting, UserSettingType } from "../../structs/usersettings.js";
import { db } from "../../database.js";
import { makeAlertsMenu, makeButtons, makeEmbed } from "./interfaceCreator.js";
import CryptoStat from "../../structs/cryptoStat.js";
export default class AlertsInteractionProcessor extends InteractionProcessor {
    static async processStringSelect(interaction) {
        if (interaction.customId.startsWith("alerts_menu")) {
            if (interaction.values[0] == "default") {
                await interaction.reply({
                    content: `Error: You have not set any alerts. Please set one with ${chatInputApplicationCommandMention("coin", (await interaction.client.application.commands.fetch()).find((command)=>command.name == "coin").id)} before proceeding.`,
                    ephemeral: true
                });
                return;
            }
            const instructions = await makeEmbed(interaction.values, interaction);
            await interaction.update({
                embeds: [
                    instructions
                ],
                components: [
                    await makeAlertsMenu(interaction),
                    await makeButtons(interaction)
                ]
            });
        }
    }
    static async processButton(interaction) {
        const selected = await AlertsInteractionProcessor.parseSelected(interaction);
        if (interaction.customId.startsWith("alerts_enable")) {
            for (const alert of selected){
                alert.alertDisabled = 0;
                await db.run("update user_settings set alertDisabled=0 where id=? and type=? and alertToken=? and alertStat=? and alertThreshold=? and alertDirection=?", interaction.user.id, UserSettingType[UserSettingType.ALERT], alert.alertToken, alert.alertStat, alert.alertThreshold, alert.alertDirection);
            }
        } else if (interaction.customId.startsWith("alerts_disable")) {
            for (const alert1 of selected){
                alert1.alertDisabled = 1;
                await db.run("update user_settings set alertDisabled=1 where id=? and type=? and alertToken=? and alertStat=? and alertThreshold=? and alertDirection=?", interaction.user.id, UserSettingType[UserSettingType.ALERT], alert1.alertToken, alert1.alertStat, alert1.alertThreshold, alert1.alertDirection);
            }
        } else if (interaction.customId.startsWith("alerts_delete")) {
            for (const alert2 of selected){
                await db.run("delete from user_settings where id=? and type=? and alertToken=? and alertStat=? and alertThreshold=? and alertDirection=?", interaction.user.id, UserSettingType[UserSettingType.ALERT], alert2.alertToken, alert2.alertStat, alert2.alertThreshold, alert2.alertDirection);
            }
            selected.length = 0;
        }
        await interaction.update({
            embeds: [
                await makeEmbed(selected, interaction)
            ],
            components: [
                await makeAlertsMenu(interaction),
                await makeButtons(interaction)
            ]
        });
    }
    static async parseSelected(interaction) {
        const selected = [];
        for (const line of interaction.message.embeds[0].description.split("\n")){
            const input = line.match(new RegExp(/- ([❌✅]) When (.+) of (.+) is (less|greater) than (.+)/));
            if (!input) {
                continue;
            }
            const setting = new UserSetting();
            setting.id = interaction.user.id;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            setting.alertStat = CryptoStat.longToShort(CryptoStat.listLongs().find((k)=>k == input[2].toLowerCase()));
            setting.alertToken = (await db.get("select id from cmc_cache where name=?", input[3])).id;
            setting.alertThreshold = Number(input[5].replace(new RegExp(/[$%]/), ""));
            setting.alertDirection = input[4] == "less" ? "<" : ">";
            setting.alertDisabled = input[1] == "❌" ? 1 : 0;
            setting.type = UserSettingType[UserSettingType.ALERT];
            selected.push(setting);
        }
        return selected;
    }
}

//# sourceMappingURL=interactionProcessor.js.map