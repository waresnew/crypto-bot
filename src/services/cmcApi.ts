import {CronJob} from "cron";
import {db, genSqlInsertCommand} from "../database";
import {commandIds, cryptoSymbolList} from "../utils";
import {CryptoApiData} from "../structs/cryptoapidata";
import {UserSetting, UserSettingType} from "../structs/usersettings";
import CryptoStat from "../structs/cryptoStat";
import {formatAlert} from "../ui/alerts/interfaceCreator";
import {getEmbedTemplate} from "../ui/templates";
import discordRequest from "../requests";
import {APIChannel} from "discord-api-types/v10";
import {analytics} from "../analytics/segment";

export const cmcCron = new CronJob(
    "*/5 * * * *",
    updateCmc,
    null,
    false,
    "America/Toronto"
);

export async function updateCmc() {
    const request = await fetch(
        "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?" +
        new URLSearchParams({
            limit: "200"
        }),
        {
            method: "GET",
            headers: {
                "X-CMC_PRO_API_KEY": process.env["COINMARKETCAP_KEY"],
                Accept: "application/json",
                "Accept-Encoding": "deflate, gzip",
                "Content-Type": "application/json"
            }
        }
    );
    const json = JSON.parse(await request.text());
    const errorCode = json.status.error_code;
    if (errorCode != 0) {
        console.log(`Error code ${errorCode} from the CoinMarketCap API occured at ${json.status.timestamp}`);
        return;
    }
    const oldCoins: CryptoApiData[] = [];
    await db.each("select * from cmc_cache", (err, row) => {
        if (err) {
            throw err;
        }
        oldCoins.push(row);
    });
    cryptoSymbolList.length = 0;
    const newCoins: CryptoApiData[] = [];
    for (let i = 0; i < json.data.length; i++) {
        const data = {...json.data[i], ...json.data[i]["quote"]["USD"]} as CryptoApiData;
        cryptoSymbolList.push(data.symbol);
        newCoins.push(data);
    }
    const expiredAlerts: UserSetting[] = [];
    for (const coin of oldCoins) {
        if (!newCoins.find(c => c.id == coin.id)) {
            console.log(`Coin ${coin.name} is no longer in the top 200`);
            await db.each("select * from user_settings where type=? and alertToken=?", UserSettingType[UserSettingType.ALERT], coin.id, (err, row) => {
                if (err) {
                    throw err;
                }
                expiredAlerts.push(row as UserSetting);
            });
        }
    }
    await notifyExpiredAlerts(expiredAlerts.map(alert => alert.id), expiredAlerts);
    await notifyUsers();
    console.log("Sent alerts");
    await db.run("begin");
    await db.run("delete from cmc_cache");
    for (const coin of newCoins) {
        await genSqlInsertCommand(coin, "cmc_cache", new CryptoApiData());
    }
    await db.run("commit");
    console.log(`Updated caches at ${new Date().toString()}`);

}

export async function notifyExpiredAlerts(toDm: string[], alerts: UserSetting[]) {
    for (const user of toDm) {
        const expired = alerts.filter(alert => alert.id == user);
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
        const channel = await discordRequest("https://discord.com/api/v10/users/@me/channels", {
            method: "POST",
            body: JSON.stringify({recipient_id: user})
        });
        await discordRequest(`https://discord.com/api/v10/channels/${(JSON.parse(await channel.text()) as APIChannel).id}/messages`, {
            method: "POST",
            body: JSON.stringify({embeds: [message]})
        });
    }
}

export async function notifyUsers() {
    const cache: CryptoApiData[] = await db.all("select * from cmc_cache");
    const alerts: UserSetting[] = await db.all("select * from user_settings where type=?", UserSettingType[UserSettingType.ALERT]);
    const toDm = new Map<string, string[]>();
    for (const crypto of cache) {
        for (const alert of alerts) {
            if (alert.alertToken != crypto.id) {
                continue;
            }
            if (alert.alertDisabled) {
                continue;
            }
            const expr = crypto[CryptoStat.shortToDb(alert.alertStat)] + alert.alertDirection + alert.alertThreshold;
            if (!new RegExp(/^[\d-.e<>]+$/).test(expr)) { //match num>num or num<num
                console.log(`Potentially malicious code almost ran: \`${expr}\``);
                continue;
            }
            if (eval(expr)) {
                if (!toDm.has(alert.id)) {
                    toDm.set(alert.id, []);
                }
                toDm.get(alert.id).push(await formatAlert(alert));
                await db.run("update user_settings set alertDisabled=1 where id=? and type=? and alertToken=? and alertStat=? and alertThreshold=? and alertDirection=?", alert.id, UserSettingType[UserSettingType.ALERT], alert.alertToken, alert.alertStat, alert.alertThreshold, alert.alertDirection);
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
        desc += `\n\nThe above alert${notifs.length > 1 ? "s have" : " has"} been **disabled** and won't trigger again until you re-enable ${notifs.length > 1 ? "them" : "it"} at </alerts:${commandIds.get("alerts")}>.\n\nHappy trading!`;
        message.description = desc;
        analytics.track({
            userId: user,
            event: "Alert(s) Triggered",
            properties: {
                alerts: notifs.length
            }
        });
        const channel = await discordRequest("https://discord.com/api/v10/users/@me/channels", {
            method: "POST",
            body: JSON.stringify({recipient_id: user})
        });
        await discordRequest(`https://discord.com/api/v10/channels/${(JSON.parse(await channel.text()) as APIChannel).id}/messages`, {
            method: "POST",
            body: JSON.stringify({embeds: [message]})
        });
    }
}