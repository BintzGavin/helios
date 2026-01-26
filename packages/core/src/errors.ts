export enum HeliosErrorCode {
  INVALID_DURATION = 'INVALID_DURATION',
  INVALID_FPS = 'INVALID_FPS',
  INVALID_INPUT_RANGE = 'INVALID_INPUT_RANGE',
  INVALID_OUTPUT_RANGE = 'INVALID_OUTPUT_RANGE',
  UNSORTED_INPUT_RANGE = 'UNSORTED_INPUT_RANGE',
  INVALID_SPRING_CONFIG = 'INVALID_SPRING_CONFIG'
}

export class HeliosError extends Error {
  public readonly code: HeliosErrorCode;
  public readonly suggestion?: string;

  constructor(code: HeliosErrorCode, message: string, suggestion?: string) {
    super(message);
    this.name = 'HeliosError';
    this.code = code;
    this.suggestion = suggestion;

    // Restore prototype chain for instanceof checks
    Object.setPrototypeOf(this, HeliosError.prototype);
  }

  static isHeliosError(error: unknown): error is HeliosError {
    return error instanceof HeliosError;
  }
}
