import {CronJob} from "cron";
import {commandIds, cryptoSymbolList, discordGot, Indexable} from "../utils";
import {CmcLatestListing, CmcLatestListingModel} from "../structs/cmcLatestListing";
import {CoinAlert, CoinAlertModel} from "../structs/coinAlert";
import CryptoStat from "../structs/cryptoStat";
import {formatAlert} from "../ui/alerts/interfaceCreator";
import {getEmbedTemplate} from "../ui/templates";
import {APIChannel} from "discord-api-types/v10";
import {analytics} from "../analytics/segment";
import got from "got";
import {db} from "../database";

let cmcKeyIndex = 1;
export const cmcCron = new CronJob(
    "* * * * *",
    updateCmc,
    null,
    false,
    "America/Toronto"
);

export function getCmcKey() {
    const key = process.env[`COINMARKETCAP_KEY${cmcKeyIndex}`];
    cmcKeyIndex++;
    if (cmcKeyIndex > 5) {
        cmcKeyIndex = 1;
    }
    return key;
}

export async function updateCmc() {
    const request = await got(
        "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?" +
        new URLSearchParams({
            limit: "200"
        }),
        {
            method: "GET",
            headers: {
                "X-CMC_PRO_API_KEY": getCmcKey(),
                Accept: "application/json",
                "Accept-Encoding": "deflate, gzip",
                "Content-Type": "application/json"
            }
        }
    ).text();
    const json = JSON.parse(request);
    const errorCode = json.status.error_code;
    if (errorCode != 0) {
        console.log(`Error code ${errorCode} from the CoinMarketCap API occured at ${json.status.timestamp}`);
        return;
    }
    const oldCoins: CmcLatestListing[] = await CmcLatestListingModel.find({});
    cryptoSymbolList.length = 0;
    const newCoins: CmcLatestListing[] = [];
    for (let i = 0; i < json.data.length; i++) {
        const data = new CmcLatestListingModel({...json.data[i], ...json.data[i]["quote"]["USD"]});
        data.cmc_id = json.data[i].id;
        data.last_updated = new Date().toISOString();
        cryptoSymbolList.push(data.symbol);
        newCoins.push(data);
    }
    const expiredAlerts: CoinAlert[] = [];
    for (const coin of oldCoins) {
        if (!newCoins.find(c => c.id == coin.id)) {
            console.log(`Coin ${coin.name} is no longer in the top 200`);
            (await CoinAlertModel.find({id: coin.id})).forEach(alert => expiredAlerts.push(alert));
        }
    }
    await notifyExpiredAlerts(expiredAlerts.map(alert => alert.user), expiredAlerts);

    await db.transaction(async () => {
        await CmcLatestListingModel.deleteMany({});
        await CmcLatestListingModel.insertMany(newCoins);
    });
    await notifyUsers();
}

export async function notifyExpiredAlerts(toDm: string[], alerts: CoinAlert[]) {
    for (const user of toDm) {
        const expired = alerts.filter(alert => alert.user == user);
        const message = getEmbedTemplate();
        message.title = `⚠️ Alert${expired.length > 1 ? "s" : ""} expired!`;
        let desc = `The following alert${expired.length > 1 ? "s have" : " has"} expired:\n`;
        for (const line of expired) {
            desc += "\n- " + await formatAlert(line);
        }
        desc += `\n\nThe above coins are no longer in the top 200 cryptocurrencies by market cap. Due to technical limitations, Botchain cannot track such cryptocurrencies. As such, the above alert${expired.length > 1 ? "s have" : " has"} been **deleted**. Please keep a closer eye on the above cryptocurrencies as you will no longer receive alerts for them.\n\nHappy trading!`;
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
    const cache: CmcLatestListing[] = await CmcLatestListingModel.find({});
    const alerts: CoinAlert[] = await CoinAlertModel.find({});
    const toDm = new Map<string, string[]>();
    for (const crypto of cache) {
        for (const alert of alerts) {
            if (alert.coin != crypto.id) {
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
                await CoinAlertModel.deleteOne({
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