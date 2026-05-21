export class ApiError extends Error {
    constructor(message, code, status) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

export function defaultMessageForStatus(status) {
  if (status === 403) return 'You do not have permission to perform this action. You may have to sign out and sign in again.';
  if (status === 404) return 'The requested resource was not found.';
  if (status === 413) return 'The file is too large to upload.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'Something went wrong on our end. Please try again later.';
  return 'An unexpected error occurred. Please try again.';
}

export function errorCodeForStatus(status) {
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 413) return 'FILE_TOO_LARGE';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER_ERROR';
  return 'REQUEST_FAILED';
}
