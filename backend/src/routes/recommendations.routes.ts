import { Router } from 'express';
import { dataStore } from '../services/dataStore.js';
import { jsonResponse, errorResponse } from '../lib/response.js';

export const router = Router();

// Recommendations
router.get('/recommendations', (req, res) => {
  jsonResponse(res, {
    title: 'What should you do next?',
    items: dataStore.getRecommendations(),
  });
});

router.post('/recommendations/:id/plan', (req, res) => {
  const planned = dataStore.planRecommendation(req.params.id);
  if (!planned) {
    return errorResponse(res, 'Recommendation not found or cannot be planned', 'BAD_REQUEST', 400);
  }
  jsonResponse(res, planned, 'Added recommendation to Content Planner');
});

// Trends
router.get('/trends', (req, res) => {
  jsonResponse(res, {
    title: "What's changing?",
    trends: dataStore.getTrends(),
  });
});
