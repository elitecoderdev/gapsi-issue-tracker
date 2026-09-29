export interface User {
  readonly username: string;
  readonly fullName: string;
}

export interface LoginCredentials {
  readonly username: string;
  readonly password: string;
}

export interface Session {
  readonly accessToken: string;
  readonly expiresAt: number;
  readonly user: User;
}

export interface LoginResponseDto {
  readonly access_token: string;
  readonly token_type: 'bearer';
  readonly expires_in: number;
  readonly user: {
    readonly username: string;
    readonly full_name: string;
  };
}

export type LogoutReason = 'manual' | 'expired';
