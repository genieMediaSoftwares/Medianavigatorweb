import { Router } from 'express';
import multer from 'multer';
import { filesController as c } from '../controllers/files.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimit.js';
import { config } from '../config/env.js';
import { files as v } from '../validators/index.js';

// Memory storage bounded by FILE_MAX_BYTES; one file per request. Type/extension/magic-byte checks happen in the service.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.storage.maxFileBytes, files: 1, fields: 5 } });

export const filesRouter = Router();
filesRouter.use(authenticate);
filesRouter.get('/', validate({ query: v.list }), c.list);
filesRouter.post('/', uploadLimiter, upload.single('file'), validate({ body: v.upload }), c.upload);
filesRouter.get('/:id', validate({ params: v.idParams }), c.get);
filesRouter.delete('/:id', validate({ params: v.idParams }), c.remove);
