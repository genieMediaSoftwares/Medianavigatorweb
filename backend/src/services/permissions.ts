import { ROLES, isStaffRole, type Role, type Permission } from '../../../shared/admin.js';

const all: readonly Permission[] = ['system.view', 'monitoring.view', 'errors.view', 'permissions.view', 'users.view', 'users.suspend', 'roles.manage', 'credits.adjust', 'credits.view', 'connections.view', 'connections.sync', 'syncruns.view', 'audit.view'];
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  user: [], admin: all, super_admin: all,
  // Domain-scoped audit access and support suspension need additional controls before being granted.
  ops_admin: ['system.view', 'monitoring.view', 'errors.view', 'permissions.view', 'users.view', 'connections.view', 'connections.sync', 'syncruns.view'],
  support: ['system.view', 'permissions.view', 'users.view', 'credits.view', 'connections.view', 'connections.sync', 'syncruns.view'],
  auditor: ['system.view', 'monitoring.view', 'errors.view', 'permissions.view', 'users.view', 'credits.view', 'connections.view', 'syncruns.view', 'audit.view'],
};
export const permissionsFor = (role: Role): readonly Permission[] => Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role) ? ROLE_PERMISSIONS[role] : [];
export const hasPermission = (role: Role, permission: Permission) => permissionsFor(role).includes(permission);
export function permissionCatalogue() {
  return { roles: ROLES.map((role) => ({ role, permissions: permissionsFor(role), adminAccess: isStaffRole(role) })), safeguards: ['Database role and active session checked on every admin API request', 'Named permissions checked on every admin endpoint', 'Self role/status changes are forbidden', 'Last super administrator cannot be removed or disabled', 'Account disabling revokes sessions', 'Administrative mutations, customer detail reads and permission denials are audited'], limitations: ['MFA and step-up are not yet implemented', 'Support suspension and operations audit access are withheld pending additional controls'] };
}
