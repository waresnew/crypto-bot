//safe to display to users
export class UserError {
    error: any;

    constructor(error: any) {
        this.error = error;
        Object.setPrototypeOf(this, UserError.prototype);
    }
}