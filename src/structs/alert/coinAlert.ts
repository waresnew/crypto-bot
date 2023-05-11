export class CoinAlert {
    user?: string;
    coin: number;
    stat: string;
    threshold: string;
    direction: string;
    disabled: boolean;
    //guild only stuff
    guild?: string;
    channel?: string;
    roleIdPing?: string;
    message?: string;
}