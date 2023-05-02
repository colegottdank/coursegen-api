import { BaseError } from './BaseError.ts';

export class UnauthorizedError extends BaseError {
    constructor(message: string) {
        super("4001", message);
    }
}