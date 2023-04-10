abstract class Alert {
    user: string;
    type: "COIN" | "GAS" | "TXN";
    disabled: boolean;

    async shouldTrigger() {
        return !this.disabled;
    }

    async format() {
        return "";
    }
}