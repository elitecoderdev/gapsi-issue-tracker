import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { API_BASE_URL } from '@core/config/api-base-url';
import { Observable, map, tap } from 'rxjs';
import { LoginCredentials, LoginResponseDto, LogoutReason, Session, User } from './auth.models';
import { SessionStorage } from './session-storage';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(SessionStorage);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly session = signal<Session | null>(this.storage.read());

  readonly currentUser = computed<User | null>(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly loginUrl = `${this.baseUrl}/auth/login`;

  constructor() {
    effect((onCleanup) => {
      const session = this.session();
      if (!session) {
        return;
      }
      const timer = setTimeout(() => this.logout('expired'), Math.max(session.expiresAt - Date.now(), 0));
      onCleanup(() => clearTimeout(timer));
    });
  }

  accessToken(): string | null {
    const session = this.session();
    return session && session.expiresAt > Date.now() ? session.accessToken : null;
  }

  login(credentials: LoginCredentials): Observable<User> {
    return this.http.post<LoginResponseDto>(this.loginUrl, credentials).pipe(
      map((response) => this.toSession(response)),
      tap((session) => {
        this.storage.write(session);
        this.session.set(session);
      }),
      map((session) => session.user),
    );
  }

  logout(reason: LogoutReason = 'manual'): void {
    this.storage.clear();
    this.session.set(null);
    void this.router.navigate(['/login'], {
      queryParams: reason === 'expired' ? { session: 'expired' } : {},
    });
  }

  private toSession(response: LoginResponseDto): Session {
    return {
      accessToken: response.access_token,
      expiresAt: Date.now() + response.expires_in * 1000,
      user: { username: response.user.username, fullName: response.user.full_name },
    };
  }
}
