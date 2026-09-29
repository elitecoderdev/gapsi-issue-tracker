import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { Session } from './auth.models';
import { SessionStorage } from './session-storage';

const KEY = environment.sessionStorageKey;

function buildSession(overrides: Partial<Session> = {}): Session {
  return {
    accessToken: 'token-123',
    expiresAt: Date.now() + 60_000,
    user: { username: 'admin', fullName: 'Ada Lovelace' },
    ...overrides,
  };
}

describe('SessionStorage', () => {
  let storage: SessionStorage;

  beforeEach(() => {
    sessionStorage.clear();
    storage = TestBed.inject(SessionStorage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('returns null when nothing is stored', () => {
    expect(storage.read()).toBeNull();
  });

  it('writes and reads back a valid session', () => {
    const session = buildSession();
    storage.write(session);

    expect(storage.read()).toEqual(session);
  });

  it('clears the stored session', () => {
    storage.write(buildSession());
    storage.clear();

    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('discards an expired session', () => {
    storage.write(buildSession({ expiresAt: Date.now() - 1 }));

    expect(storage.read()).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it.each([
    { accessToken: 1 },
    { expiresAt: 'soon' },
    { user: { username: 'admin' } },
    { user: { fullName: 'Ada' } },
    { user: null },
  ])('discards a session with an invalid shape %o', (overrides) => {
    sessionStorage.setItem(KEY, JSON.stringify({ ...buildSession(), ...overrides }));

    expect(storage.read()).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('discards corrupt JSON', () => {
    sessionStorage.setItem(KEY, '{not-json');

    expect(storage.read()).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('survives a storage that throws on every operation', () => {
    const failure = () => {
      throw new Error('denied');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(failure);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(failure);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(failure);

    expect(storage.read()).toBeNull();
    expect(() => storage.write(buildSession())).not.toThrow();
    expect(() => storage.clear()).not.toThrow();
  });

  it('is a no-op when session storage is unavailable', () => {
    vi.stubGlobal('sessionStorage', undefined);

    expect(storage.read()).toBeNull();
    expect(() => storage.write(buildSession())).not.toThrow();
    expect(() => storage.clear()).not.toThrow();
  });
});
