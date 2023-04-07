import {CoinAlert} from "../structs/coinAlert";
import {getEmbedTemplate} from "../ui/templates";
import {formatAlert} from "../ui/alerts/interfaceCreator";
import {analytics} from "../analytics/segment";
import {commandIds, cryptoMetadataList, discordGot, getLatestCandle, Indexable} from "../utils";
import {APIChannel} from "discord-api-types/v10";
import CryptoStat from "../structs/cryptoStat";
import {Candle} from "../structs/candle";
import {CoinAlerts} from "../database";

export async function notifyExpiredAlerts(toDm: string[], alerts: CoinAlert[]) {
    for (const user of toDm) {
        const expired = alerts.filter(alert => alert.user == user);
        const message = getEmbedTemplate();
        message.title = `⚠️ Alert${expired.length > 1 ? "s" : ""} expired!`;
        let desc = `The following alert${expired.length > 1 ? "s have" : " has"} expired:\n`;
        for (const line of expired) {
            desc += "\n- " + await formatAlert(line);
        }
        desc += `\n\nThe above coins are no longer in listed in major exchanges. Due to technical limitations, Botchain cannot track such cryptocurrencies. As such, the above alert${expired.length > 1 ? "s have" : " has"} been **deleted**. Please keep a closer eye on the above cryptocurrencies as you will no longer receive alerts for them.\n\nHappy trading!`;
        message.description = desc;
        analytics.track({
            userId: user,
            event: "Alert(s) expired",
            properties: {
                alerts: expired.length
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

/**
 * Evaluates an inequality expression safely
 * @param expr only numbers, <, >, are allowed (no equal signs)
 * @returns true if the expression is true, false otherwise
 */
export function evalInequality(expr: string) {
    const match = expr.match(/^([\d-.e]+)([<>])([\d-.e]+)$/);
    if (!match) {
        return false;
    }
    const a = parseFloat(match[1]);
    const b = parseFloat(match[3]);
    switch (match[2]) {
        case ">":
            return a > b;
        case "<":
            return a < b;
    }
    return false;
}

export async function notifyUsers() {
    const cache: Candle[] = [];
    for (const meta of cryptoMetadataList) {
        cache.push(await getLatestCandle(meta.cmc_id));
    }
    const alerts: CoinAlert[] = await CoinAlerts.find({}).toArray();
    const toDm = new Map<string, string[]>();
    for (const crypto of cache) {
        for (const alert of alerts) {
            if (alert.coin != crypto.coin) {
                continue;
            }
            if (alert.disabled) {
                continue;
            }
            const expr = (crypto as Indexable)[CryptoStat.shortToDb(alert.stat)] + alert.direction + alert.threshold;
            if (evalInequality(expr)) {
                if (!toDm.has(alert.user)) {
                    toDm.set(alert.user, []);
                }
                toDm.get(alert.user).push(await formatAlert(alert));
                await CoinAlerts.deleteOne({
                    user: alert.user,
                    stat: alert.stat,
                    threshold: alert.threshold,
                    direction: alert.direction,
                    coin: alert.coin
                });
            }
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
        desc += `\n\nThe above alert${notifs.length > 1 ? "s have" : " has"} been **deleted** and won't trigger again.\n\n**❤️ If Botchain has helped you, please upvote the bot with </vote:${commandIds.get("vote")}>.**\nHappy trading!`;
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