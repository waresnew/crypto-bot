import InteractionProcessor from "../abstractInteractionProcessor.js";
import {
    ButtonInteraction,
    chatInputApplicationCommandMention,
    MessageComponentInteraction,
    StringSelectMenuInteraction
} from "discord.js";
import {UserSetting, UserSettingType} from "../../structs/usersettings.js";
import {db} from "../../database.js";
import {makeAlertsMenu, makeButtons, makeEmbed} from "./interfaceCreator.js";
import CryptoStat from "../../structs/cryptoStat.js";

export default class AlertsInteractionProcessor extends InteractionProcessor {
    static override async processStringSelect(interaction: StringSelectMenuInteraction) {
        if (interaction.customId.startsWith("alerts_menu")) {
            if (interaction.values[0] == "default") {
                await interaction.reply({
                    content: `You have not set any alerts. Please set one with ${chatInputApplicationCommandMention("coin", (await interaction.client.application.commands.fetch()).find(command => command.name == "coin").id)
                    } before proceeding.`,
                    ephemeral: true
                });
                return;
            }
            const instructions = await makeEmbed(interaction.values, interaction.client);
            await interaction.update({embeds: [instructions], components: interaction.message.components});
        }
    }

    static override async processButton(interaction: ButtonInteraction) {
        const selected = await AlertsInteractionProcessor.parseSelected(interaction);
        if (interaction.customId.startsWith("alerts_enable")) {
            for (const alert of selected) {
                alert.alertDisabled = 0;
                await db.run("update user_settings set alertDisabled=0 where id=? and type=? and alertToken=? and alertStat=? and alertThreshold=? and alertDirection=?", interaction.user.id, UserSettingType[UserSettingType.ALERT], alert.alertToken, alert.alertStat, alert.alertThreshold, alert.alertDirection);
            }
        } else if (interaction.customId.startsWith("alerts_disable")) {
            for (const alert of selected) {
                alert.alertDisabled = 1;
                await db.run("update user_settings set alertDisabled=1 where id=? and type=? and alertToken=? and alertStat=? and alertThreshold=? and alertDirection=?", interaction.user.id, UserSettingType[UserSettingType.ALERT], alert.alertToken, alert.alertStat, alert.alertThreshold, alert.alertDirection);
            }
        } else if (interaction.customId.startsWith("alerts_delete")) {
            for (const alert of selected) {
                await db.run("delete from user_settings where id=? and type=? and alertToken=? and alertStat=? and alertThreshold=? and alertDirection=?", interaction.user.id, UserSettingType[UserSettingType.ALERT], alert.alertToken, alert.alertStat, alert.alertThreshold, alert.alertDirection);
            }
            selected.length = 0;
        }
        await interaction.update({
            embeds: [await makeEmbed(selected, interaction.client)],
            components: [await makeAlertsMenu(interaction), await makeButtons(interaction)]
        });
    }

    static async parseSelected(interaction: MessageComponentInteraction) {
        const selected: UserSetting[] = [];
        for (const line of interaction.message.embeds[0].description.split("\n")) {
            const input = line.match(new RegExp(/- ([❌✅]) When (.+) of (.+) is (less|greater) than (.+)/));
            if (!input) {
                continue;
            }
            const setting = new UserSetting();
            setting.id = interaction.user.id;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            setting.alertStat = CryptoStat.longToShort(CryptoStat.listLongs().find(k => k == input[2].toLowerCase()));
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