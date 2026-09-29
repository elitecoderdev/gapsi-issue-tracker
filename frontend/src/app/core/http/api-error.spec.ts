import { HttpErrorResponse } from '@angular/common/http';
import { resolveErrorMessage } from './api-error';

describe('resolveErrorMessage', () => {
  it('returns the API error message when the body follows the error contract', () => {
    const error = new HttpErrorResponse({
      status: 404,
      error: { error: { code: 'issue_not_found', message: 'La incidencia no existe.' } },
    });

    expect(resolveErrorMessage(error)).toBe('La incidencia no existe.');
  });

  it('returns an offline message when the server is unreachable', () => {
    expect(resolveErrorMessage(new HttpErrorResponse({ status: 0 }))).toContain('No fue posible conectar');
  });

  it('falls back to the provided message for unknown errors', () => {
    expect(resolveErrorMessage(new Error('boom'), 'Fallback')).toBe('Fallback');
    expect(resolveErrorMessage(new HttpErrorResponse({ status: 500, error: 'html' }), 'Fallback')).toBe('Fallback');
  });
});
