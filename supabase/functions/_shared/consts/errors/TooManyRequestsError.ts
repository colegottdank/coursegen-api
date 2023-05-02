import { BaseError } from './BaseError.ts';

export class TooManyRequestsError extends BaseError {
    constructor(message: string) {
        super("429", message);
    }
}