import type { Role } from '../../../shared/admin.js';
export type { Role };

export interface AuthContext {
  userId: string;
  sessionId: string;
  role: Role;
  mfaEnabled?: boolean;
  /** When this session last re-confirmed the user's credentials (step-up), from the database. */
  reauthAt?: Date | null;
}
