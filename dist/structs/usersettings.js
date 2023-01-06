export class UserSetting {
    /**fill the table */ dummy = 0;
    /**user id */ id = "ERROR";
    /**setting type */ type = "ERROR";
    ///notifs
    /**token id to track */ alertToken = 0;
    /**which stat to listen to */ alertStat = "ERROR";
    /**at what value to trigger notif */ alertThreshold = 0;
    //favourite crypto id
    favouriteCrypto = 0;
}
export var UserSettingType;
(function(UserSettingType) {
    UserSettingType[UserSettingType["ALERT"] = 0] = "ALERT";
    UserSettingType[UserSettingType["FAVOURITE_CRYPTO"] = 1] = "FAVOURITE_CRYPTO";
})(UserSettingType || (UserSettingType = {}));

//# sourceMappingURL=usersettings.js.map