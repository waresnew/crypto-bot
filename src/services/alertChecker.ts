import {getEmbedTemplate} from "../ui/templates";
import {analytics} from "../utils/analytics";
import {APIChannel} from "discord-api-types/v10";
import {DmCoinAlerts, DmGasAlerts, GuildCoinAlerts, GuildGasAlerts} from "../utils/database";
import {CoinMetadata} from "../structs/coinMetadata";
import {commandIds, discordGot} from "../utils/discordUtils";
import {validCryptos} from "../utils/coinUtils";
import {checkAlert, formatAlert, formatCoinAlert, getAlertDb} from "../utils/alertUtils";
import {CoinAlert} from "../structs/alert/coinAlert";
import crypto from "node:crypto";

function makeExpiredCoinEmbed(userExpiredAlerts: CoinAlert[], oldCryptos: CoinMetadata[]) {
    const message = getEmbedTemplate();
    message.title = `⚠️ Alert${userExpiredAlerts.length > 1 ? "s" : ""} expired!`;
    let desc = `The following alert${userExpiredAlerts.length > 1 ? "s have" : " has"} expired:\n`;

    for (const line of userExpiredAlerts) {
        desc += "\n- " + formatCoinAlert(line, oldCryptos);
    }
    desc += `\n\nThe above coins are no longer in listed in major exchanges. Due to technical limitations, Botchain cannot track such cryptocurrencies. As such, the above alert${userExpiredAlerts.length > 1 ? "s have" : " has"} been **deleted**. Please keep a closer eye on the above cryptocurrencies as you will no longer receive alerts for them.\n\nHappy trading!`;
    message.description = desc;
    return message;
}

export async function notifyExpiredCoins(oldCryptos: CoinMetadata[]) {
    const dmExpired = await DmCoinAlerts.find({coin: {$nin: validCryptos.map(meta => meta.cmc_id)}}).toArray();
    await DmCoinAlerts.deleteMany({coin: {$nin: validCryptos.map(meta => meta.cmc_id)}});
    const dmRemovedCoins = dmExpired.map(alert => alert.coin);
    if (dmRemovedCoins.length > 0) {
        console.log(`Removed ${dmExpired.length} expired DM alerts for ${dmRemovedCoins.join(", ")}`);
    }
    const toDm = dmExpired.map(alert => alert.user);
    for (const user of toDm) {
        const userExpiredAlerts = dmExpired.filter(alert => alert.user == user);
        const message = makeExpiredCoinEmbed(userExpiredAlerts, oldCryptos);
        analytics.track({
            userId: user,
            event: "Alert(s) expired",
            properties: {
                alerts: userExpiredAlerts.length
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

        }
    }
    const guildExpired = await GuildCoinAlerts.find({coin: {$nin: validCryptos.map(meta => meta.cmc_id)}}).toArray();
    await GuildCoinAlerts.deleteMany({coin: {$nin: validCryptos.map(meta => meta.cmc_id)}});
    const guildRemovedCoins = dmExpired.map(alert => alert.coin);
    if (guildRemovedCoins.length > 0) {
        console.log(`Removed ${dmExpired.length} expired guild alerts for ${guildRemovedCoins.join(", ")}`);
    }
    const toMsgChannel = guildExpired.map(alert => alert.channel);
    for (const channel of toMsgChannel) {
        const expiredChannel = guildExpired.filter(alert => alert.channel == channel);
        const message = makeExpiredCoinEmbed(expiredChannel, oldCryptos);
        analytics.track({
            anonymousId: crypto.randomUUID(),
            event: "Guild Alert(s) expired",
            properties: {
                alerts: expiredChannel.length
            }
        });
        try {
            await discordGot(`channels/${channel}/messages`, {
                method: "POST",
                body: JSON.stringify({embeds: [message]})
            });
        } catch (e) {

        }
    }
}

function makeTriggerAlertEmbed(notifs: string[]) {
    const message = getEmbedTemplate();
    message.title = `⚠️ Alert${notifs.length > 1 ? "s" : ""} triggered!`;
    let desc = `The following alert${notifs.length > 1 ? "s have" : " has"} been triggered:\n`;
    notifs.forEach(line => {
        desc += "\n- " + line;
    });
    desc += `\n\nThe above alert${notifs.length > 1 ? "s have" : " has"} been **disabled** and won't trigger again. If you want to re-enable these alert(s), please do so with </myalerts:${commandIds.get("myalerts")}> or </serveralerts:${commandIds.get("serveralerts")}>.\n\n**❤️ If Botchain has helped you, please upvote the bot with </vote:${commandIds.get("vote")}>.\nIf you want to add Botchain to your server, just click [here](https://discord.com/api/oauth2/authorize?client_id=1058388231273590885&permissions=133120&scope=bot%20applications.commands).**\nHappy trading!`;
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
            toDm.get(alert.user).push(formatAlert(alert));
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
                msg: formatAlert(alert),
                role: alert.roleIdPing == "null" ? null : `<@&${alert.roleIdPing}>`
            });
            await getAlertDb(alert).updateOne(alert, {
                $set: {
                    disabled: true
                }
            });
        }
    }
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

        }
    }
}