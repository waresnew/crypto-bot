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

new CronJob(
    "*/5 * * * *",
    updateCmc,
    null,
    true,
    "America/Toronto"
);

export async function updateCmc() {
    const request = await fetch(
        "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?" +
        new URLSearchParams({
            limit: "200"
        }),
        {
            method: "get",
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
    await db.run("begin");
    await db.run("delete from cmc_cache");
    cryptoSymbolList.length = 0;
    for (let i = 0; i < 200; i++) {
        const data = {...json.data[i], ...json.data[i]["quote"]["USD"]} as CryptoApiData;
        cryptoSymbolList.push(data.symbol);
        await genSqlInsertCommand(data, "cmc_cache", new CryptoApiData());
    }
    await db.run("commit");
    console.log(`Updated caches at ${new Date().toString()}`);
    await notifyUsers();
    console.log("Sent alerts");
}

async function notifyUsers() {
    const cache: CryptoApiData[] = await db.all("select * from cmc_cache");
    const alerts: UserSetting[] = await db.all("select id,alertToken,alertStat,alertThreshold,alertDirection,alertDisabled from user_settings where type=?", UserSettingType[UserSettingType.ALERT]);
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
        const channel = await discordRequest("https://discord.com/api/v10/users/@me/channels", {
            body: JSON.stringify({recipient_id: user})
        });
        await discordRequest(`https://discord.com/api/v10/channels/${(JSON.parse(await channel.text()) as APIChannel).id}/messages`, {
            body: JSON.stringify(message)
        });
    }
}