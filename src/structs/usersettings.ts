export class UserSetting {
    [index: string]: string | number;

    /**fill the table */
    dummy = 0;
    /**user id */
    id: string = null;
    /**setting type */
    type: string = null;
    ///notifs
    /**token id to track */
    alertToken = 0;
    /**which stat to listen to */
    alertStat: string = null;
    /**at what value to trigger notif */
    alertThreshold = 0;
    /** alert direction (> or <) */
    alertDirection: string = null;
    /** if alert is disabled */
    alertDisabled = 0;

    //favourite crypto id
    favouriteCrypto = 0;
}

export enum UserSettingType {
    ALERT,
    FAVOURITE_CRYPTO
}
