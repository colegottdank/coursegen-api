export class BaseError extends Error {
  public code: string;
  public httpStatus: string;
  public message: string;

  constructor(httpStatus: string, message: string, code: string = httpStatus) {
    console.log(`code: ${code}, httpStatus: ${httpStatus}, message: ${message}`);
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
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
  constructor(message: string, code: string = "422") {
    super("422", message, code);
  }
}

export class SupabaseError extends BaseError {
  constructor(httpStatus: string, message: string) {
    super(httpStatus, message);
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

export class TooManyConcurrentGenerations extends BaseError {
  constructor(maxGenerations: number) {
    super("429", `Too many concurrent generations, max allowed: ${maxGenerations}`, ErrorCodes.TooManyTotalConcurrentGenerations);
  }
}

export class TooManyConcurrentCourseGenerations extends BaseError {
  constructor(maxGenerations: number) {
    super("429", `Too many concurrent course generations, max allowed: ${maxGenerations}`, ErrorCodes.TooManyConcurrentCourseGenerations);
  }
}

export class TooManyConcurrentLessonGenerations extends BaseError {
  constructor(maxGenerations: number) {
    super("429", `Too many concurrent lesson generations, max allowed: ${maxGenerations}`, ErrorCodes.TooManyConcurrentLessonGenerations);
  }
}

export class AlreadyGeneratingError extends BaseError {
  constructor(reference_type: string, reference_id: string) {
    super("429", `Already generating ${reference_type} with id: ${reference_id}`, ErrorCodes.AlreadyGenerating);
  }
}

export class InvalidGenerationReferenceTypeError extends BaseError {
  constructor(invalidReferenceType: string) {
    super("400", `Invalid generation reference type: ${invalidReferenceType}`);
  }
}

export class InvalidGenerationStatusError extends BaseError {
  constructor(invalidGenerationStatus: string) {
    super("400", `Invalid generation status: ${invalidGenerationStatus}`);
  }
}

export enum ErrorCodes {
  InvalidCourseRequest = "CRSE-42201",
  TooManyTotalConcurrentGenerations = "CRSE-42900",
  TooManyConcurrentCourseGenerations = "CRSE-42901",
  TooManyConcurrentLessonGenerations = "CRSE-42902",
  AlreadyGenerating = "CRSE-42903",
}
