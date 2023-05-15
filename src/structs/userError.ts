//safe to display to users
export class UserError {
    error: any;

    constructor(error: any) {
        this.error = error + "\n\nNeed help? Join the official support server here: https://discord.gg/mpyPadCG3q";
        Object.setPrototypeOf(this, UserError.prototype);
    }
}