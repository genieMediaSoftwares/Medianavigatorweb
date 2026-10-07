import type { Response } from 'express';

export function jsonResponse(res: Response, data: any, message = 'Success', status = 200) {
  return res.status(status).json({
    success: true,
    data,
    message,
  });
}

export function errorResponse(res: Response, message = 'Internal Error', code = 'ERROR', status = 500) {
  return res.status(status).json({
    success: false,
    message,
    code,
  });
}
