import { BaseError } from './BaseError.ts';

export class BadRequestError extends BaseError {
    constructor(message: string) {
        super("400", message);
    }
}