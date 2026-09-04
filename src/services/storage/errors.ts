/** Raised when a call into chrome.storage fails. */
export class StorageError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`Storage operation failed: ${operation}`);
    this.name = 'StorageError';
    this.cause = cause;
  }
}
