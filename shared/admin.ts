/** Public role names only; the backend owns the permission assignments. */
export const ROLES = ['user', 'admin', 'super_admin', 'ops_admin', 'support', 'auditor'] as const;
export type Role = typeof ROLES[number];
export const isStaffRole = (role: unknown): role is Exclude<Role, 'user'> =>
  typeof role === 'string' && role !== 'user' && (ROLES as readonly string[]).includes(role);
export const isSuperAdmin = (role: Role) => role === 'admin' || role === 'super_admin';
export type Permission = 'system.view' | 'monitoring.view' | 'errors.view' | 'permissions.view' | 'users.view' | 'users.suspend' | 'roles.manage' | 'credits.adjust' | 'credits.view' | 'connections.view' | 'connections.sync' | 'syncruns.view' | 'audit.view';
