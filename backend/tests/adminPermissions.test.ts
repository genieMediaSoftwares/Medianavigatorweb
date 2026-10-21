import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { api, clearDb, reauth, registerAdmin, registerUser, startTestDb, stopTestDb } from './helpers.js';
import { userRepository } from '../src/repositories/user.repository.js';
import { ROLE_PERMISSIONS } from '../src/services/permissions.js';
import { ROLES, type Permission } from '../../shared/admin.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { adminService } from '../src/services/admin.service.js';

beforeAll(startTestDb); afterAll(stopTestDb); beforeEach(clearDb);
const missing = '64b000000000000000000099';
// Independent expectations: changing the permission map alone cannot make these tests pass.
const routes: { method: 'get' | 'post' | 'patch'; path: string; permission: Permission; roles: string[]; allowed: number; body?: object }[] = [
  { method: 'get', path: '/system', permission: 'system.view', roles: ['admin', 'super_admin', 'ops_admin', 'support', 'auditor'], allowed: 200 },
  { method: 'get', path: '/monitoring', permission: 'monitoring.view', roles: ['admin', 'super_admin', 'ops_admin', 'auditor'], allowed: 200 },
  { method: 'get', path: '/errors', permission: 'errors.view', roles: ['admin', 'super_admin', 'ops_admin', 'auditor'], allowed: 200 },
  { method: 'get', path: '/permissions', permission: 'permissions.view', roles: ['admin', 'super_admin', 'ops_admin', 'support', 'auditor'], allowed: 200 },
  { method: 'get', path: '/users', permission: 'users.view', roles: ['admin', 'super_admin', 'ops_admin', 'support', 'auditor'], allowed: 200 },
  { method: 'get', path: `/users/${missing}`, permission: 'users.view', roles: ['admin', 'super_admin', 'ops_admin', 'support', 'auditor'], allowed: 404 },
  { method: 'get', path: '/connections', permission: 'connections.view', roles: ['admin', 'super_admin', 'ops_admin', 'support', 'auditor'], allowed: 200 },
  { method: 'get', path: '/sync-runs', permission: 'syncruns.view', roles: ['admin', 'super_admin', 'ops_admin', 'support', 'auditor'], allowed: 200 },
  { method: 'get', path: '/audit-logs', permission: 'audit.view', roles: ['admin', 'super_admin', 'auditor'], allowed: 200 },
  { method: 'patch', path: `/users/${missing}/role`, permission: 'roles.manage', roles: ['admin', 'super_admin'], allowed: 404, body: { role: 'support' } },
  { method: 'patch', path: `/users/${missing}/status`, permission: 'users.suspend', roles: ['admin', 'super_admin'], allowed: 404, body: { status: 'disabled' } },
  { method: 'patch', path: `/users/${missing}/credits`, permission: 'credits.adjust', roles: ['admin', 'super_admin'], allowed: 404, body: { amount: 10 } },
  { method: 'get', path: `/users/${missing}/credit-ledger`, permission: 'credits.view', roles: ['admin', 'super_admin', 'support', 'auditor'], allowed: 404 },
  { method: 'post', path: `/connections/${missing}/sync`, permission: 'connections.sync', roles: ['admin', 'super_admin', 'ops_admin', 'support'], allowed: 404 },
];

describe('backend permission enforcement', () => {
  it.each(ROLES)('enforces every existing administrative endpoint for %s using the database role', async (role) => {
    const staff = await registerUser(`${role}@permissions.example`);
    await userRepository.setRole(staff.id, role);
    await reauth(staff);
    for (const route of routes) {
      const res = await api()[route.method](`/api/v1/admin${route.path}`).set(staff.auth).send(route.body);
      expect(res.status, `${role} ${route.method} ${route.path}`).toBe(route.roles.includes(role) ? route.allowed : 403);
      if (!route.roles.includes(role)) expect(await AuditLog.exists({ actorId: staff.id, action: 'admin.forbidden', targetId: route.permission })).toBeTruthy();
    }
    const me = await api().get('/api/v1/auth/me').set(staff.auth);
    expect(me.body.data.user.permissions).toEqual(ROLE_PERMISSIONS[role]);
  });

  it('preserves self and last-super-admin safeguards across the legacy alias', async () => {
    const admin = await registerAdmin();
    await userRepository.setRole(admin.id, 'super_admin');
    await expect(adminService.setRole({ userId: missing }, admin.id, 'support')).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(adminService.setStatus({ userId: missing }, admin.id, 'disabled')).rejects.toMatchObject({ code: 'CONFLICT' });
    expect((await api().patch(`/api/v1/admin/users/${admin.id}/role`).set(admin.auth).send({ role: 'user' })).status).toBe(400);
    const target = await registerUser('new-support@permissions.example');
    const promoted = await api().patch(`/api/v1/admin/users/${target.id}/role`).set(admin.auth).send({ role: 'support' });
    expect(promoted.status).toBe(200);
    expect((await api().get('/api/v1/admin/users').set(target.auth)).status).toBe(200);
    expect((await api().patch(`/api/v1/admin/users/${admin.id}/role`).set(target.auth).send({ role: 'user' })).status).toBe(403);
    await userRepository.setRole(target.id, 'user');
    expect((await api().get('/api/v1/admin/users').set(target.auth)).status).toBe(403);
  });
});
