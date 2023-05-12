import {CoinAlert} from "./coinAlert";

export class GuildCoinAlert extends CoinAlert {
    guild: string;
    channel: string;
    roleIdPing: string;
    message?: string;
}