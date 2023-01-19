import InteractionProcessor from "../abstractInteractionProcessor";
import {UserSetting, UserSettingType} from "../../structs/usersettings";
import {db} from "../../database";
import {makeAlertsMenu, makeButtons, makeEmbed} from "./interfaceCreator";
import CryptoStat from "../../structs/cryptoStat";
import {
    APIInteraction,
    APIMessageComponentButtonInteraction,
    APIMessageComponentSelectMenuInteraction,
    InteractionResponseType,
    MessageFlags
} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {commandIds} from "../../utils";

export default class AlertsInteractionProcessor extends InteractionProcessor {
    static override async processStringSelect(interaction: APIMessageComponentSelectMenuInteraction, http: FastifyReply) {
        if (interaction.data.custom_id.startsWith("alerts_menu")) {
            if (interaction.data.values[0] == "default") {
                const coinLink = `</coin:${commandIds.get("coin")}>`;
                await http.send({
                    type: InteractionResponseType.ChannelMessageWithSource, data: {
                        content: `Error: You have not set any alerts. Please set one with ${coinLink} before proceeding.`,
                        flags: MessageFlags.Ephemeral
                    }
                });
                return;
            }

            const instructions = await makeEmbed(interaction.data.values, interaction);

            await http.send({
                type: InteractionResponseType.UpdateMessage, data: {
                    embeds: [instructions],
                    components: [await makeAlertsMenu(interaction), await makeButtons(interaction)]
                }
            });
        }
    }

    static override async processButton(interaction: APIMessageComponentButtonInteraction, http: FastifyReply) {
        const selected = await AlertsInteractionProcessor.parseSelected(interaction);
        if (interaction.data.custom_id.startsWith("alerts_enable")) {
            for (const alert of selected) {
                alert.alertDisabled = 0;
                await db.run("update user_settings set alertDisabled=0 where id=? and type=? and alertToken=? and alertStat=? and alertThreshold=? and alertDirection=?", interaction.user.id, UserSettingType[UserSettingType.ALERT], alert.alertToken, alert.alertStat, alert.alertThreshold, alert.alertDirection);
            }
        } else if (interaction.data.custom_id.startsWith("alerts_disable")) {
            for (const alert of selected) {
                alert.alertDisabled = 1;
                await db.run("update user_settings set alertDisabled=1 where id=? and type=? and alertToken=? and alertStat=? and alertThreshold=? and alertDirection=?", interaction.user.id, UserSettingType[UserSettingType.ALERT], alert.alertToken, alert.alertStat, alert.alertThreshold, alert.alertDirection);
            }
        } else if (interaction.data.custom_id.startsWith("alerts_delete")) {
            for (const alert of selected) {
                await db.run("delete from user_settings where id=? and type=? and alertToken=? and alertStat=? and alertThreshold=? and alertDirection=?", interaction.user.id, UserSettingType[UserSettingType.ALERT], alert.alertToken, alert.alertStat, alert.alertThreshold, alert.alertDirection);
            }
            selected.length = 0;
        }
        await http.send({
            type: InteractionResponseType.UpdateMessage, data: {
                embeds: [await makeEmbed(selected, interaction)],
                components: [await makeAlertsMenu(interaction), await makeButtons(interaction)]
            }
        });
    }

    static async parseSelected(interaction: APIInteraction) {
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