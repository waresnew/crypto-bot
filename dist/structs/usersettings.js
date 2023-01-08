export class UserSetting {
    /**fill the table */ dummy = 0;
    /**user id */ id = null;
    /**setting type */ type = null;
    ///notifs
    /**token id to track */ alertToken = 0;
    /**which stat to listen to */ alertStat = null;
    /**at what value to trigger notif */ alertThreshold = 0;
    /** alert direction (> or <) */ alertDirection = null;
    /** if alert is disabled */ alertDisabled = 0;
    //favourite crypto id
    favouriteCrypto = 0;
}
export var UserSettingType;
(function(UserSettingType) {
    UserSettingType[UserSettingType["ALERT"] = 0] = "ALERT";
    UserSettingType[UserSettingType["FAVOURITE_CRYPTO"] = 1] = "FAVOURITE_CRYPTO";
})(UserSettingType || (UserSettingType = {}));

//# sourceMappingURL=usersettings.js.map