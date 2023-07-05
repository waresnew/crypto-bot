/* istanbul ignore file */
import {CoinAlert} from "../structs/alert/coinAlert";
import {getLatestCandle} from "./coinUtils";
import {DmCoinAlerts, DmGasAlerts, GuildCoinAlerts, GuildGasAlerts, LatestCoins} from "./database";
import CryptoStat from "../structs/cryptoStat";
import {idToMeta, nameToMeta} from "../structs/coinMetadata";
import {GasAlert} from "../structs/alert/gasAlert";
import {gasPrices} from "../services/etherscanRest";
import {APIInteraction} from "discord-api-types/v10";
import {commandIds} from "./discordUtils";
import {analytics} from "./analytics";
import {UserError} from "../structs/userError";
import BigNumber from "bignumber.js";
import {DmCoinAlert} from "../structs/alert/dmCoinAlert";
import {GuildCoinAlert} from "../structs/alert/guildCoinAlert";
import {DmGasAlert} from "../structs/alert/dmGasAlert";
import {GuildGasAlert} from "../structs/alert/guildGasAlert";
import {deleteUndefinedProps} from "./utils";

type Alert = CoinAlert | GasAlert;
export type AlertMethod = "guild" | "dm";
export type GuildAlert = GuildCoinAlert | GuildGasAlert;
export type DmAlert = DmCoinAlert | DmGasAlert;

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
    const a = new BigNumber(match[1]);
    const b = new BigNumber(match[3]);
    switch (match[2]) {
        case ">":
            return a.gt(b);
        case "<":
            return a.lt(b);
    }
    return false;
}

export async function validateAlert(alert: Alert) {
    const manageAlertLink = alert instanceof DmCoinAlert || alert instanceof DmGasAlert ? `</myalerts:${commandIds.get("myalerts")}>` : `</serveralerts:${commandIds.get("serveralerts")}>`;
    let alerts;
    if (alert instanceof DmCoinAlert || alert instanceof DmGasAlert) {
        alerts = [...await DmCoinAlerts.find({user: alert.user}).toArray(), ...await DmGasAlerts.find({user: alert.user}).toArray()];
    } else if (alert instanceof GuildCoinAlert || alert instanceof GuildGasAlert) {
        alerts = [...await GuildCoinAlerts.find({guild: alert.guild}).toArray(), ...await GuildGasAlerts.find({guild: alert.guild}).toArray()];
    }
    const isDm = alert instanceof DmCoinAlert || alert instanceof DmGasAlert;
    const isGuild = alert instanceof GuildCoinAlert || alert instanceof GuildGasAlert;
    if (alerts.length >= 10) {
        analytics.track({
            userId: isDm ? alert.user : isGuild ? alert.guild : null,
            event: "Alert Creation Failed",
            properties: {
                reason: "Too many alerts"
            }
        });

        throw new UserError(`Error: You can not have more than 10 alerts set. Please delete one before proceeding with ${manageAlertLink}.`);
    }
    if (await getAlertDb(alert).findOne(alert)) {
        if (alert instanceof DmCoinAlert || alert instanceof DmGasAlert) {
            analytics.track({
                userId: alert.user,
                event: "Alert Creation Failed",
                properties: {
                    reason: "Duplicate alert"
                }
            });
        }
        throw new UserError(`Error: You already have an alert exactly like the one you are trying to add. Please delete it before proceeding with ${manageAlertLink}.`);
    }
}

export async function checkCoinAlert(alert: CoinAlert) {
    if (alert.disabled) {
        return false;
    }
    let left = "0";
    const candle = await getLatestCandle(alert.coin);
    const latest = await LatestCoins.findOne({coin: alert.coin});
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
    return evalInequality(expr);
}

//only to be used by expired coin handler
export async function formatCoinAlert(alert: CoinAlert) {
    const fancyStat = CryptoStat.shortToLong(alert.stat);
    return `When ${fancyStat} of ${(await idToMeta(alert.coin)).name} is ${alert.direction == "<" ? "less than" : "greater than"} ${(alert.stat == "price" ? "$" : "") + new BigNumber(alert.threshold).toString() + (alert.stat.endsWith("%") ? "%" : "")}`;
}

export function checkGasAlert(alert: GasAlert) {
    if (alert.disabled) {
        return false;
    }
    return new BigNumber(gasPrices[alert.speed]).lte(new BigNumber(alert.threshold));
}

function formatGasAlert(alert: GasAlert) {
    return `When gas for a ${alert.speed} transaction is less than ${alert.threshold} gwei`;
}

async function parseIdCoinAlert(id: string, interaction: APIInteraction, guild: boolean) {
    const alert = guild ? new GuildCoinAlert() : new DmCoinAlert();
    const tokens = id.split("_").slice(1); //remove coin_ prefix
    alert.coin = Number(tokens[0]);
    alert.stat = tokens[1];
    alert.threshold = tokens[2];
    alert.direction = tokens[3] as "<" | ">";
    const old = alert instanceof GuildCoinAlert ?
        await GuildCoinAlerts.findOne({
            coin: alert.coin,
            stat: alert.stat,
            threshold: alert.threshold,
            direction: alert.direction,
            guild: interaction.guild_id
        })
        : await DmCoinAlerts.findOne({
            coin: alert.coin,
            stat: alert.stat,
            threshold: alert.threshold,
            direction: alert.direction,
            user: interaction.user.id
        });
    if (old) {
        if (alert instanceof GuildCoinAlert) {
            alert.guild = interaction.guild_id;
            alert.channel = (old as GuildCoinAlert).channel;
            alert.roleIdPing = (old as GuildCoinAlert).roleIdPing;
        } else {
            (alert as DmCoinAlert).user = interaction.user.id;
        }
    }
    if (!old) {
        alert.disabled = false;
    } else {
        alert.disabled = old["disabled"];
        alert.message = old.message;
    }
    return alert;
}

async function parseIdGasAlert(id: string, interaction: APIInteraction, guild: boolean) {
    const alert = guild ? new GuildGasAlert() : new DmGasAlert();
    const tokens = id.split("_").slice(1); //remove gas_ prefix
    alert.speed = tokens[0];
    alert.threshold = tokens[1];
    const old = alert instanceof GuildGasAlert ?
        await GuildGasAlerts.findOne({
            speed: alert.speed,
            threshold: alert.threshold,
            guild: interaction.guild_id
        }) : await DmGasAlerts.findOne({
            speed: alert.speed,
            threshold: alert.threshold,
            user: interaction.user.id
        });
    if (old) {
        if (alert instanceof GuildGasAlert) {
            alert.guild = interaction.guild_id;
            alert.channel = (old as GuildGasAlert).channel;
            alert.roleIdPing = (old as GuildGasAlert).roleIdPing;
        } else {
            alert.user = interaction.user.id;
        }
    }
    if (!old) {
        alert.disabled = false;
    } else {
        alert.disabled = old["disabled"];
        alert.message = old.message;

    }
    return alert;
}

async function parsePrettyCoinAlert(pretty: string, interaction: APIInteraction, guild: boolean) {
    const input = pretty.match(new RegExp(/^- ([❌✅]) When (.+) of (.+) is (less|greater) than (.+)$/));
    const alert = guild ? new GuildCoinAlert() : new DmCoinAlert();
    if (alert instanceof GuildCoinAlert) {
        alert.guild = interaction.guild_id;
    } else {
        alert.user = interaction.user.id;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    alert.stat = CryptoStat.longToShort(CryptoStat.listLongs().find(k => k == input[2].toLowerCase()));
    alert.coin = (await nameToMeta(input[3])).cmc_id;
    alert.threshold = input[5].replace(new RegExp(/[$%]/), "");
    alert.direction = input[4] == "less" ? "<" : ">";
    alert.disabled = input[1] == "❌";
    const old = alert instanceof GuildCoinAlert ? await GuildCoinAlerts.findOne({
        coin: alert.coin,
        guild: alert.guild,
        stat: alert.stat,
        threshold: alert.threshold,
        direction: alert.direction
    }) : await DmCoinAlerts.findOne({
        coin: alert.coin,
        user: alert.user,
        stat: alert.stat,
        threshold: alert.threshold,
        direction: alert.direction
    });
    if (old) {
        alert.message = old.message;
        if (alert instanceof GuildCoinAlert) {
            alert.channel = (old as GuildCoinAlert).channel;
            alert.roleIdPing = (old as GuildCoinAlert).roleIdPing;
        }
    }
    return alert;
}

async function parsePrettyGasAlert(pretty: string, interaction: APIInteraction, guild: boolean) {
    const input = pretty.match(new RegExp(/^- ([❌✅]) When gas for a (.+) transaction is less than (.+) gwei$/));
    const alert = guild ? new GuildGasAlert() : new DmGasAlert();
    if (alert instanceof GuildGasAlert) {
        alert.guild = interaction.guild_id;
    } else {
        alert.user = interaction.user.id;
    }
    alert.speed = input[2];
    alert.threshold = input[3];
    alert.disabled = input[1] == "❌";
    const old = alert instanceof GuildGasAlert ? await GuildGasAlerts.findOne({
        speed: alert.speed,
        threshold: alert.threshold,
        guild: alert.guild
    }) : await DmGasAlerts.findOne({
        speed: alert.speed,
        threshold: alert.threshold,
        user: alert.user
    });
    if (old) {
        alert.message = old.message;
        if (alert instanceof GuildGasAlert) {
            alert.channel = (old as GuildGasAlert).channel;
            alert.roleIdPing = (old as GuildGasAlert).roleIdPing;
        }
    }
    return alert;
}

async function makeCoinAlertSelectEntry(alert: CoinAlert) {
    const fancyStat = CryptoStat.shortToLong(alert.stat);

    return {
        label: `${alert.disabled ? "❌" : "✅"} ${fancyStat.charAt(0).toUpperCase() + fancyStat.substring(1)} of ${(await idToMeta(alert.coin)).name}`,
        description: (alert.direction == "<" ? "Less than " : "Greater than ") + (alert.stat == "price" ? "$" : "") + new BigNumber(alert.threshold).toString() + (alert.stat.endsWith("%") ? "%" : ""),
        value: `coin_${alert.coin}_${alert.stat}_${alert.threshold}_${alert.direction}`
    };
}

function makeGasAlertSelectEntry(alert: GasAlert) {
    return {
        label: `${alert.disabled ? "❌" : "✅"} ${alert.speed.charAt(0).toUpperCase() + alert.speed.substring(1)} transaction gas fee of ETH`,
        description: `Less than ${alert.threshold} Gwei`,
        value: `gas_${alert.speed}_${alert.threshold}`
    };
}

export function getAlertDb(alert: Alert) {
    if ("coin" in alert) {
        if (alert instanceof DmCoinAlert || "user" in alert) {
            return DmCoinAlerts;
        } else if (alert instanceof GuildCoinAlert || "guild" in alert) {
            return GuildCoinAlerts;
        }
    } else if ("speed" in alert) {
        if (alert instanceof DmGasAlert || "user" in alert) {
            return DmGasAlerts;
        } else if (alert instanceof GuildGasAlert || "guild" in alert) {
            return GuildGasAlerts;
        }
    }
    throw new Error("Invalid alert type");
}

export async function makeAlertSelectEntry(alert: Alert) {
    if ("coin" in alert) {
        return await makeCoinAlertSelectEntry(alert);
    } else if ("speed" in alert) {
        return makeGasAlertSelectEntry(alert);
    }
    throw new Error("Invalid alert type");
}

export async function parsePrettyAlert(pretty: string, interaction: APIInteraction, guild: boolean) {
    if (new RegExp(/^- ([❌✅]) When (.+) of (.+) is (less|greater) than (.+)$/).test(pretty)) {
        return deleteUndefinedProps(await parsePrettyCoinAlert(pretty, interaction, guild));
    } else if (new RegExp(/^- ([❌✅]) When gas for a (.+) transaction is less than (.+) gwei$/).test(pretty)) {
        return deleteUndefinedProps(await parsePrettyGasAlert(pretty, interaction, guild));
    } else {
        return null;
    }
}

export async function parseAlertId(id: string, interaction: APIInteraction, guild: boolean) {
    if (id.startsWith("gas")) {
        return deleteUndefinedProps(await parseIdGasAlert(id, interaction, guild));
    } else if (id.startsWith("coin")) {
        return deleteUndefinedProps(await parseIdCoinAlert(id, interaction, guild));
    }
    throw new Error("Invalid alert type");
}

//duck typing :vomit:
export async function formatAlert(alert: Alert) {
    let result;
    if ("coin" in alert) {
        result = await formatCoinAlert(alert);
    } else if ("speed" in alert) {
        result = formatGasAlert(alert);
    } else {
        throw new Error("Invalid alert type");
    }
    if ("guild" in alert) {
        result += `\n  - Channel: <#${(alert as GuildAlert).channel}>`;
        if ((alert as GuildAlert).roleIdPing != "null") {
            result += `\n  - Role Ping: <@&${(alert as GuildAlert).roleIdPing}>`;
        }
    }
    if (alert.message) {
        result += `\n  - Message: ${alert.message}`;
    }
    return result + "\n";
}

export async function checkAlert(alert: Alert) {
    if ("coin" in alert) {
        return checkCoinAlert(alert);
    } else if ("speed" in alert) {
        return checkGasAlert(alert);
    }
    throw new Error("Invalid alert type");
}

