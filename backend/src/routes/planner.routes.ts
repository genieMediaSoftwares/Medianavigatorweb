import { Router } from 'express';
import { dataStore } from '../services/dataStore.js';
import { jsonResponse, errorResponse } from '../lib/response.js';

export const router = Router();

// Content Planner
router.get('/planner', (req, res) => {
  jsonResponse(res, dataStore.getPlannedContent());
});

router.post('/planner', (req, res) => {
  const { day, time, platform, contentType, title } = req.body;
  if (!day || !time || !platform || !title) {
    return errorResponse(res, 'Missing required fields for content planner', 'BAD_REQUEST', 400);
  }
  const created = dataStore.addPlannedContent({
    day,
    time,
    platform,
    contentType: contentType || 'Post',
    title,
    status: 'scheduled',
  });
  jsonResponse(res, created, 'Added item to planner');
});

router.delete('/planner/:id', (req, res) => {
  dataStore.removePlannedContent(req.params.id);
  jsonResponse(res, { id: req.params.id }, 'Removed planned item');
});
