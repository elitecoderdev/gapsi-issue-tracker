import { HttpErrorResponse } from '@angular/common/http';

interface ApiErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

const DEFAULT_MESSAGE = 'Ocurrió un error inesperado. Intenta nuevamente.';
const OFFLINE_MESSAGE = 'No fue posible conectar con el servidor. Revisa tu conexión.';

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  if (typeof body !== 'object' || body === null || !('error' in body)) {
    return false;
  }
  const { error } = body as { error: unknown };
  return typeof error === 'object' && error !== null && typeof (error as { message?: unknown }).message === 'string';
}

export function resolveErrorMessage(error: unknown, fallback: string = DEFAULT_MESSAGE): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }
  if (error.status === 0) {
    return OFFLINE_MESSAGE;
  }
  return isApiErrorBody(error.error) ? error.error.error.message : fallback;
}
