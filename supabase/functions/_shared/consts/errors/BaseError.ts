export class BaseError extends Error {
    public code: string;
    public message: string;

    constructor(code: string, message: string) {
        console.log("code: " + code + ", message: " + message);
        super(message);
        this.code = code;
        this.message = message;
    }
}