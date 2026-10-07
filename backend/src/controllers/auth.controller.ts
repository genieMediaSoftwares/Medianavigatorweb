import type { Request } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/response.js';
import { authService } from '../services/auth.service.js';
import { userService } from '../services/user.service.js';

const client = (req: Request) => ({ userAgent: req.header('user-agent') ?? undefined, ip: req.ip });

export const authController = {
  register: asyncHandler(async (req, res) => ok(res, await authService.register(req.body, client(req)), 201)),
  login: asyncHandler(async (req, res) => ok(res, await authService.login(req.body, client(req)))),
  refresh: asyncHandler(async (req, res) => ok(res, { tokens: await authService.refresh(req.body.refreshToken, client(req)) })),
  logout: asyncHandler(async (req, res) => { await authService.logout(req.auth!.sessionId); ok(res, { loggedOut: true }); }),
  logoutAll: asyncHandler(async (req, res) => { await authService.logoutAll(req.auth!.userId); ok(res, { loggedOut: true }); }),
  me: asyncHandler(async (req, res) => ok(res, await userService.me(req.auth!.userId))),
  changePassword: asyncHandler(async (req, res) => {
    await authService.changePassword(req.auth!.userId, req.auth!.sessionId, req.body.currentPassword, req.body.newPassword);
    ok(res, { changed: true });
  }),
  forgotPassword: asyncHandler(async (req, res) => {
    await authService.forgotPassword(req.body.email);
    ok(res, { message: 'If an account exists for that email, a reset link has been sent.' }, 202);
  }),
  resetPassword: asyncHandler(async (req, res) => { await authService.resetPassword(req.body.token, req.body.newPassword); ok(res, { reset: true }); }),
};
