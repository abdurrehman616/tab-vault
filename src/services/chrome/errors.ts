/** Raised when a call into the Chrome extension APIs fails. */
export class ChromeApiError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`Chrome API call failed: ${operation}`);
    this.name = 'ChromeApiError';
    this.cause = cause;
  }
}
