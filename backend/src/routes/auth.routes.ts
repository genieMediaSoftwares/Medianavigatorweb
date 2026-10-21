import { Router } from 'express';
import { authController as c } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { auth as v } from '../validators/index.js';

export const authRouter = Router();
authRouter.use(authLimiter);
authRouter.post('/register', validate({ body: v.register }), c.register);
authRouter.post('/login', validate({ body: v.login }), c.login);
authRouter.post('/refresh', validate({ body: v.refresh }), c.refresh);
authRouter.post('/forgot-password', validate({ body: v.forgot }), c.forgotPassword);
authRouter.post('/reset-password', validate({ body: v.reset }), c.resetPassword);
authRouter.post('/logout', authenticate, c.logout);
authRouter.post('/logout-all', authenticate, c.logoutAll);
authRouter.get('/me', authenticate, c.me);
authRouter.post('/change-password', authenticate, validate({ body: v.changePassword }), c.changePassword);
// Step-up and two-step sign-in (all under authLimiter).
authRouter.post('/reauth', authenticate, validate({ body: v.reauth }), c.reauth);
authRouter.get('/mfa', authenticate, c.mfaStatus);
authRouter.post('/mfa/setup', authenticate, validate({ body: v.mfaSetup }), c.mfaSetup);
authRouter.post('/mfa/enable', authenticate, validate({ body: v.mfaEnable }), c.mfaEnable);
authRouter.post('/mfa/disable', authenticate, validate({ body: v.mfaConfirm }), c.mfaDisable);
authRouter.post('/mfa/recovery-codes', authenticate, validate({ body: v.mfaConfirm }), c.mfaRecoveryCodes);
