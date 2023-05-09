import {getEmbedTemplate} from "../ui/templates";
import {analytics} from "../utils/analytics";
import {APIChannel} from "discord-api-types/v10";
import {CoinAlerts, GasAlerts} from "../utils/database";
import {CoinMetadata} from "../structs/coinMetadata";
import {commandIds, discordGot} from "../utils/discordUtils";
import {validCryptos} from "../utils/coinUtils";
import {checkAlert, formatAlert, formatCoinAlert, getAlertDb} from "../utils/alertUtils";

export async function notifyExpiredCoins(oldCryptos: CoinMetadata[]) {
    const expired = await CoinAlerts.find({coin: {$nin: validCryptos.map(meta => meta.cmc_id)}}).toArray();
    const found = await CoinAlerts.find({coin: {$nin: validCryptos.map(meta => meta.cmc_id)}}).toArray();
    await CoinAlerts.deleteMany({coin: {$nin: validCryptos.map(meta => meta.cmc_id)}});
    const removedCoins = expired.map(alert => alert.coin);
    if (removedCoins.length > 0) {
        console.log(`Removed ${found.length} expired alerts for ${removedCoins.join(", ")}`);
    }
    const toDm = expired.map(alert => alert.user);
    for (const user of toDm) {
        const expiredUser = expired.filter(alert => alert.user == user);
        const message = getEmbedTemplate();
        message.title = `⚠️ Alert${expiredUser.length > 1 ? "s" : ""} expired!`;
        let desc = `The following alert${expiredUser.length > 1 ? "s have" : " has"} expired:\n`;

        for (const line of expiredUser) {
            desc += "\n- " + formatCoinAlert(line, oldCryptos);
        }
        desc += `\n\nThe above coins are no longer in listed in major exchanges. Due to technical limitations, Botchain cannot track such cryptocurrencies. As such, the above alert${expiredUser.length > 1 ? "s have" : " has"} been **deleted**. Please keep a closer eye on the above cryptocurrencies as you will no longer receive alerts for them.\n\nHappy trading!`;
        message.description = desc;
        analytics.track({
            userId: user,
            event: "Alert(s) expired",
            properties: {
                alerts: expiredUser.length
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
}
export async function triggerAlerts() {
    const toDm = new Map<string, string[]>();
    const alerts = [...await CoinAlerts.find({}).toArray(), ...await GasAlerts.find({}).toArray()];
    for (const alert of alerts) {
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
        const message = getEmbedTemplate();
        message.title = `⚠️ Alert${notifs.length > 1 ? "s" : ""} triggered!`;
        let desc = `The following alert${notifs.length > 1 ? "s have" : " has"} been triggered:\n`;
        notifs.forEach(line => {
            desc += "\n- " + line;
        });
        desc += `\n\nThe above alert${notifs.length > 1 ? "s have" : " has"} been **disabled** and won't trigger again. If you want to re-enable these alert(s), please do so with </myalerts:${commandIds.get("myalerts")}>.\n\n**❤️ If Botchain has helped you, please upvote the bot with </vote:${commandIds.get("vote")}>.**\nHappy trading!`;
        message.description = desc;
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
}