import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/response.js';
import { plannerService } from '../services/planner.service.js';

const uid = (req: any) => req.auth!.userId as string;

export const plannerController = {
  list: asyncHandler(async (req, res) => ok(res, await plannerService.list(uid(req)))),
  create: asyncHandler(async (req, res) => ok(res, await plannerService.add(uid(req), req.body), 201)),
  remove: asyncHandler(async (req, res) => ok(res, await plannerService.remove(uid(req), req.params.id))),
  insights: asyncHandler(async (req, res) => ok(res, await plannerService.insights(uid(req)))),
  planRecommendation: asyncHandler(async (req, res) => ok(res, await plannerService.planRecommendation(uid(req), req.params.id, req.body), 201)),
};
