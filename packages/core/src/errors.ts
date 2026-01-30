export enum HeliosErrorCode {
  INVALID_DURATION = 'INVALID_DURATION',
  INVALID_FPS = 'INVALID_FPS',
  INVALID_PLAYBACK_RANGE = 'INVALID_PLAYBACK_RANGE',
  INVALID_INPUT_RANGE = 'INVALID_INPUT_RANGE',
  INVALID_OUTPUT_RANGE = 'INVALID_OUTPUT_RANGE',
  UNSORTED_INPUT_RANGE = 'UNSORTED_INPUT_RANGE',
  INVALID_SPRING_CONFIG = 'INVALID_SPRING_CONFIG',
  INVALID_SRT_FORMAT = 'INVALID_SRT_FORMAT',
  INVALID_INPUT_PROPS = 'INVALID_INPUT_PROPS',
  INVALID_RESOLUTION = 'INVALID_RESOLUTION',
  INVALID_COLOR_FORMAT = 'INVALID_COLOR_FORMAT',
  INVALID_TIMECODE_FORMAT = 'INVALID_TIMECODE_FORMAT',
  INVALID_MARKER = 'INVALID_MARKER',
  MARKER_NOT_FOUND = 'MARKER_NOT_FOUND',
  INVALID_SCHEMA = 'INVALID_SCHEMA'
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
