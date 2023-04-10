import {CoinAlert} from "../structs/coinAlert";
import {getEmbedTemplate} from "../ui/templates";
import {formatAlert} from "../ui/alerts/interfaceCreator";
import {analytics} from "../segment";
import {commandIds, discordGot, getLatestCandle, validCryptos} from "../utils";
import {APIChannel} from "discord-api-types/v10";
import CryptoStat from "../structs/cryptoStat";
import {CoinAlerts, LatestCoins} from "../database";
import {CoinMetadata} from "../structs/coinMetadata";

export async function notifyExpiredAlerts(oldCryptos: CoinMetadata[]) {
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
            desc += "\n- " + await formatAlert(line, oldCryptos);
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
    const cache: CoinMetadata[] = [];
    cache.push(...validCryptos);
    const alerts: CoinAlert[] = await CoinAlerts.find({}).toArray();
    const toDm = new Map<string, string[]>();
    for (const crypto of cache) {
        for (const alert of alerts) {
            if (alert.coin != crypto.cmc_id) {
                continue;
            }
            if (alert.disabled) {
                continue;
            }
            let left = 0;
            const candle = await getLatestCandle(crypto.cmc_id);
            const latest = await LatestCoins.findOne({coin: crypto.cmc_id});
            /* istanbul ignore next */
            if (alert.stat == CryptoStat.price.shortForm) {
                left = candle.close_price;
            } else if (alert.stat == CryptoStat.percent_change_1h.shortForm) {
                left = latest.hourPriceChangePercent;
            } else if (alert.stat == CryptoStat.percent_change_24h.shortForm) {
                left = latest.dayPriceChangePercent;
            } else if (alert.stat == CryptoStat.percent_change_7d.shortForm) {
                left = latest.weekPriceChangePercent;
            }
            const expr = left + alert.direction + alert.threshold;
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