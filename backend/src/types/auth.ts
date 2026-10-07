export type Role = 'user' | 'admin';

export interface AuthContext {
  userId: string;
  sessionId: string;
  role: Role;
}
