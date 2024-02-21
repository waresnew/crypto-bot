import {getEmbedTemplate} from "../ui/templates";
import {analytics} from "../utils/analytics";
import {APIChannel} from "discord-api-types/v10";
import {DmCoinAlerts, DmGasAlerts, GuildCoinAlerts, GuildGasAlerts} from "../utils/database";
import {commandIds, discordGot} from "../utils/discordUtils";
import {checkAlert, formatAlert, getAlertDb} from "../utils/alertUtils";
import crypto from "node:crypto";
import {HTTPError} from "got";

/* istanbul ignore next */
function makeTriggerAlertEmbed(notifs: string[]) {
    const message = getEmbedTemplate();
    message.title = `⚠️ Alert${notifs.length > 1 ? "s" : ""} triggered!`;
    let desc = `The following alert${notifs.length > 1 ? "s have" : " has"} been triggered:\n`;
    notifs.forEach(line => {
        desc += "\n- " + line;
    });
    desc += `\n\nThe above alert${notifs.length > 1 ? "s have" : " has"} been **disabled** and won't trigger again. If you want to re-enable these alert(s), please do so with </myalerts:${commandIds.get("myalerts")}> or </serveralerts:${commandIds.get("serveralerts")}>.\n\nIf you want to add Botchain to your server, just click [here](https://discord.com/api/oauth2/authorize?client_id=1058388231273590885&permissions=134144&scope=bot%20applications.commands).**\nHappy trading!`;
    message.description = desc;
    return message;
}

export async function triggerAlerts() {
    const toDm = new Map<string, string[]>();
    const dmAlerts = [...await DmCoinAlerts.find({}).toArray(), ...await DmGasAlerts.find({}).toArray()];
    for (const alert of dmAlerts) {
        if (await checkAlert(alert)) {
            if (!toDm.has(alert.user)) {
                toDm.set(alert.user, []);
            }
            toDm.get(alert.user).push(await formatAlert(alert));
            await getAlertDb(alert).updateOne(alert, {
                $set: {
                    disabled: true
                }
            });
        }
    }
    for (const user of toDm.keys()) {
        const notifs = toDm.get(user);
        const message = makeTriggerAlertEmbed(notifs);
        analytics.track({
            userId: user,
            event: "Alert(s) Triggered",
            properties: {
                alerts: notifs.length
            }
        });

        try {
            const channel = await discordGot("users/@me/channels", {
                method: "POST",
                body: JSON.stringify({recipient_id: user})
            }).text();

            await discordGot(`channels/${(JSON.parse(channel) as APIChannel).id}/messages`, {
                method: "POST",
                body: JSON.stringify({embeds: [message]})
            });
        } catch (e) {
            if (e instanceof HTTPError) {
                console.error(`Failed to send triggered alerts to user ${user}: ${e.response.statusCode}`);
            }
        }
    }
    const guildAlerts = [...await GuildCoinAlerts.find({}).toArray(), ...await GuildGasAlerts.find({}).toArray()];
    const toMsgChannel = new Map<string, { msg: string, role: string }[]>();
    for (const alert of guildAlerts) {
        if (await checkAlert(alert)) {
            if (!toMsgChannel.has(alert.channel)) {
                toMsgChannel.set(alert.channel, []);
            }
            toMsgChannel.get(alert.channel).push({
                msg: await formatAlert(alert),
                role: alert.roleIdPing == "null" ? null : `<@&${alert.roleIdPing}>`
            });
            await getAlertDb(alert).updateOne(alert, {
                $set: {
                    disabled: true
                }
            });
        }
    }
    /* istanbul ignore next */
    for (const channel of toMsgChannel.keys()) {
        const notifs = toMsgChannel.get(channel);
        const message = makeTriggerAlertEmbed(notifs.map(notif => notif.msg));
        analytics.track({
            anonymousId: crypto.randomUUID(),
            event: "Guild Alert(s) Triggered",
            properties: {
                alerts: notifs.length
            }
        });
        try {
            await discordGot(`channels/${channel}/messages`, {
                method: "POST",
                body: JSON.stringify({
                    embeds: [message],
                    content: notifs.filter(n => n.role).map(notif => notif.role).join(" ")
                })
            });
        } catch (e) {
            if (e instanceof HTTPError) {
                console.error(`Failed to send triggered guild alerts to channel ${channel}: ${e.response.statusCode}`);
            }
        }
    }
}