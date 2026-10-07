import { Router } from 'express';
import { dataStore } from '../services/dataStore.js';
import { jsonResponse, errorResponse } from '../lib/response.js';

export const router = Router();

// Overview / Analytics Signals (Real data only)
router.get('/analytics/overview', (req, res) => {
  jsonResponse(res, dataStore.getOverviewData());
});

// Media Content Feed
router.get('/media', (req, res) => {
  const platform = req.query.platform as string | undefined;
  jsonResponse(res, dataStore.getMedia(platform));
});

router.get('/media/:id', (req, res) => {
  const item = dataStore.getMediaById(req.params.id);
  if (!item) {
    return errorResponse(res, 'Media item not found', 'NOT_FOUND', 404);
  }
  jsonResponse(res, item);
});

// Timing Intelligence (Real data only)
router.get('/timing', (req, res) => {
  jsonResponse(res, dataStore.getTimingData());
});
