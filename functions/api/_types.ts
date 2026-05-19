export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  mustChangePassword: boolean;
}

export type Variables = {
  user: TokenPayload;
};

export type AppEnv = {
  Bindings: Env;
  Variables: Variables;
};
