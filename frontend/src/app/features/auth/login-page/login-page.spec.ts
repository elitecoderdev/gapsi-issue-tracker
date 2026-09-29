import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { LoginCredentials, User } from '@core/auth/auth.models';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@core/notifications/toast.service';
import { Observable, Subject, of, throwError } from 'rxjs';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  const login = vi.fn<(credentials: LoginCredentials) => Observable<User>>();
  let fixture: ComponentFixture<LoginPage>;
  let element: HTMLElement;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;
  let toast: ToastService;

  beforeEach(async () => {
    login.mockReset();
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: { login } }] });
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'success');
    fixture = TestBed.createComponent(LoginPage);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  function input(name: string): HTMLInputElement {
    return element.querySelector<HTMLInputElement>(`input[formcontrolname="${name}"]`)!;
  }

  function type(name: string, value: string): void {
    input(name).value = value;
    input(name).dispatchEvent(new Event('input'));
  }

  function text(selector: string): string | null {
    return element.querySelector(selector)?.textContent?.trim() ?? null;
  }

  async function submit(): Promise<void> {
    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  async function fillCredentials(): Promise<void> {
    type('username', 'admin');
    type('password', 'secret123');
    await fixture.whenStable();
  }

  it('shows validation errors when submitting an empty form', async () => {
    await submit();

    expect(login).not.toHaveBeenCalled();
    expect(element.querySelectorAll('.field__error')).toHaveLength(2);
    expect(input('username').classList).toContain('is-invalid');
    expect(input('password').classList).toContain('is-invalid');
  });

  it('validates the minimum lengths', async () => {
    type('username', 'ab');
    type('password', 'short');
    await submit();

    expect(Array.from(element.querySelectorAll('.field__error')).map((error) => error.textContent)).toEqual([
      'Debe tener al menos 3 caracteres.',
      'Debe tener al menos 8 caracteres.',
    ]);
  });

  it('toggles the password visibility', async () => {
    const toggle = element.querySelector<HTMLButtonElement>('.password__toggle')!;
    expect(input('password').type).toBe('password');
    expect(toggle.textContent?.trim()).toBe('Mostrar');

    toggle.click();
    await fixture.whenStable();
    expect(input('password').type).toBe('text');
    expect(toggle.textContent?.trim()).toBe('Ocultar');

    toggle.click();
    await fixture.whenStable();
    expect(input('password').type).toBe('password');
  });

  it('logs in, greets the user and navigates to the issues page', async () => {
    login.mockReturnValue(of({ username: 'admin', fullName: 'Ada Lovelace' }));
    await fillCredentials();

    await submit();

    expect(login).toHaveBeenCalledWith({ username: 'admin', password: 'secret123' });
    expect(toast.success).toHaveBeenCalledWith('Bienvenido, Ada Lovelace');
    expect(navigateByUrl).toHaveBeenCalledWith('/issues');
  });

  it('disables the submit button and ignores new submissions while logging in', async () => {
    const response = new Subject<User>();
    login.mockReturnValue(response);
    await fillCredentials();

    await submit();
    const button = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Ingresando');

    await submit();
    expect(login).toHaveBeenCalledTimes(1);

    response.error(new HttpErrorResponse({ status: 500 }));
    await fixture.whenStable();
    expect(button.disabled).toBe(false);
  });

  it('shows the session expired notice until an error is displayed', async () => {
    fixture.componentRef.setInput('session', 'expired');
    await fixture.whenStable();
    expect(text('.alert--info')).not.toBeNull();

    login.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 401, error: { error: { code: 'invalid', message: 'Credenciales inválidas' } } }),
      ),
    );
    await fillCredentials();
    await submit();

    expect(text('.alert--error')).toBe('Credenciales inválidas');
    expect(text('.alert--info')).toBeNull();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('does not show the expired notice for other session values', async () => {
    fixture.componentRef.setInput('session', 'other');
    await fixture.whenStable();

    expect(text('.alert--info')).toBeNull();
  });
});
