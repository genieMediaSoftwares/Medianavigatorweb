import { Router } from 'express';
import { dataStore } from '../services/dataStore.js';
import { jsonResponse, errorResponse } from '../lib/response.js';

export const router = Router();

// Alerts
router.get('/alerts', (req, res) => {
  jsonResponse(res, dataStore.getAlerts());
});

router.post('/alerts/:id/dismiss', (req, res) => {
  const dismissed = dataStore.dismissAlert(req.params.id);
  if (!dismissed) {
    return errorResponse(res, 'Alert not found', 'NOT_FOUND', 404);
  }
  jsonResponse(res, dismissed, 'Alert dismissed');
});
