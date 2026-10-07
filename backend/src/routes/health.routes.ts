import type { Request, Response, NextFunction } from 'express';
import { dataStore } from '../services/dataStore.js';

// Root API status & health check endpoint
export function healthCheck(req: Request, res: Response, next: NextFunction) {
  if (req.url === '/api' || req.url === '/api/' || req.url === '/api/health') {
    return res.status(200).json({
      success: true,
      status: 'ok',
      service: 'Media Navigator Live API',
      version: '1.0.0',
      connectedPlatforms: dataStore.getConnections().filter(c => c.connected).map(c => c.platform)
    });
  }
  next();
}
