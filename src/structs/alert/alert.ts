export abstract class Alert {
    user: string;
    disabled: boolean;

    async shouldTrigger() {
        return !this.disabled;
    }

    abstract format(): Promise<string>;
}