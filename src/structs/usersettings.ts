export class UserSetting {
    [index: string]: string;

    /**fill the table */
    dummy: string = null;
    /**user id */
    id: string = null;
    /**setting type */
    type: string = null;
    ///notifs
    /**token id to track */
    alertToken: string = null;
    /**which stat to listen to */
    alertStat: string = null;
    /**at what value to trigger notif (raw num) */
    alertThreshold: string = null;
    /** alert direction (> or <) */
    alertDirection: string = null;
    /** if alert is disabled (0 or 1) */
    alertDisabled: string = null;

    /** favourite crypto id*/
    favouriteCrypto: string = null;
}

export enum UserSettingType {
    ALERT,
    FAVOURITE_CRYPTO
}
