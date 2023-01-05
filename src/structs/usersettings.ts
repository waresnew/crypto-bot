export class UserSetting {
    [index: string]: string | number | string[];
    /**fill the table */
    dummy = 0;
    /**user id */
    id = "ERROR";
    /**setting type */
    type = "ERROR";
    ///notifs
    /**token id to track */
    alertToken = 0;
    /**which stat to listen to */
    alertStat = "ERROR";
    /**at what value to trigger notif */
    alertThreshold = 0;

    //favourite crypto id
    favouriteCrypto = 0;
}

export enum UserSettingType {
    ALERT,
    FAVOURITE_CRYPTO
}
