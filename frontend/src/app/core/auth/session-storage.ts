import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Session } from './auth.models';

@Injectable({ providedIn: 'root' })
export class SessionStorage {
  private readonly key = environment.sessionStorageKey;

  read(): Session | null {
    try {
      const raw = globalThis.sessionStorage?.getItem(this.key);
      if (!raw) {
        return null;
      }
      const session = JSON.parse(raw) as Partial<Session>;
      return this.isValid(session) ? session : this.discard();
    } catch {
      return this.discard();
    }
  }

  write(session: Session): void {
    try {
      globalThis.sessionStorage?.setItem(this.key, JSON.stringify(session));
    } catch {
      return;
    }
  }

  clear(): void {
    try {
      globalThis.sessionStorage?.removeItem(this.key);
    } catch {
      return;
    }
  }

  private isValid(session: Partial<Session>): session is Session {
    return (
      typeof session.accessToken === 'string' &&
      typeof session.expiresAt === 'number' &&
      session.expiresAt > Date.now() &&
      typeof session.user?.username === 'string' &&
      typeof session.user?.fullName === 'string'
    );
  }

  private discard(): null {
    this.clear();
    return null;
  }
}
