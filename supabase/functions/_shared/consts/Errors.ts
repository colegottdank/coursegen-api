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

export class BadRequestError extends BaseError {
  constructor(message: string) {
    super("400", message);
  }
}

export class DownstreamError extends BaseError {
  constructor(message: string) {
    super("503", message);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string) {
    super("404", message);
  }
}

export class OpenAIError extends BaseError {
  constructor(code: string, message: string) {
    super(code, message);
  }
}

export class OpenAIInvalidResponseError extends BaseError {
  constructor(message: string) {
    super("422", message);
  }
}

export class SupabaseError extends BaseError {
  constructor(code: string, message: string) {
    super(code, message);
  }
}

export class TooManyRequestsError extends BaseError {
  constructor(message: string) {
    super("429", message);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string) {
    super("401", message);
  }
}

export class AlreadyGeneratingError extends BaseError {
  constructor() {
    super("429", "You are only allowed one generation at a time. Please wait for your current generation to finish.");
  }
}