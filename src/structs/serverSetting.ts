export class ServerSetting {
    [key: string]: string | boolean;

    guild: string;
    alertManagerRole: string;
}

export class ServerSettingMetadata {
    name: string;
    description: string;
    dbKey: string;
    default: string | boolean;
    type: "roleselect"; //|"stringselect" | "customtext" | "boolean"
    //string select only
    options?: string[];
}