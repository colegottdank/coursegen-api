import { BaseError } from './BaseError.ts';

export class NotFoundError extends BaseError {
    constructor(message: string) {
        super("404", message);
    }
}