import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { User } from '@core/auth/auth.models';
import { AuthService } from '@core/auth/auth.service';
import { Shell } from './shell';

describe('Shell', () => {
  const currentUser = signal<User | null>(null);
  const logout = vi.fn();
  let fixture: ComponentFixture<Shell>;

  beforeEach(async () => {
    logout.mockReset();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { currentUser, logout } }],
    });
    fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
  });

  function text(selector: string): string | undefined {
    return (fixture.nativeElement as HTMLElement).querySelector(selector)?.textContent?.trim();
  }

  it('hides the user chip when there is no user', async () => {
    currentUser.set(null);
    await fixture.whenStable();

    expect(text('.user-chip')).toBeUndefined();
  });

  it('shows the user with the initials of the first two names', async () => {
    currentUser.set({ username: 'alovelace', fullName: '  ada   byron lovelace ' });
    await fixture.whenStable();

    expect(text('.user-chip__avatar')).toBe('AB');
    expect(text('.user-chip__name')).toBe('ada   byron lovelace');
    expect(text('.user-chip__username')).toBe('@alovelace');
  });

  it('logs out when the logout button is clicked', () => {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!.click();

    expect(logout).toHaveBeenCalledWith();
  });
});
