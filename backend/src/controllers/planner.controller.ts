import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/response.js';
import { plannerService } from '../services/planner.service.js';

const uid = (req: any) => req.auth!.userId as string;

export const plannerController = {
  list: asyncHandler(async (req, res) => ok(res, await plannerService.list(uid(req)))),
  listPlans: asyncHandler(async (req, res) => ok(res, await plannerService.listPlans(uid(req), req.query as any))),
  get: asyncHandler(async (req, res) => ok(res, await plannerService.get(uid(req), req.params.id))),
  // A body with `targets` is a Planner V2 plan; the original weekday/time body keeps its original response.
  create: asyncHandler(async (req, res) => ok(res, 'targets' in req.body ? await plannerService.create(uid(req), req.body) : await plannerService.add(uid(req), req.body), 201)),
  update: asyncHandler(async (req, res) => ok(res, await plannerService.update(uid(req), req.params.id, req.body))),
  setStatus: asyncHandler(async (req, res) => ok(res, await plannerService.setStatus(uid(req), req.params.id, req.body))),
  publish: asyncHandler(async (req, res) => ok(res, await plannerService.publish(uid(req), req.params.id, req.body))),
  matches: asyncHandler(async (req, res) => ok(res, await plannerService.matches(uid(req), req.params.id))),
  review: asyncHandler(async (req, res) => ok(res, await plannerService.review(uid(req), req.params.id))),
  remove: asyncHandler(async (req, res) => ok(res, await plannerService.remove(uid(req), req.params.id))),
  insights: asyncHandler(async (req, res) => ok(res, await plannerService.insights(uid(req)))),
  bestTimes: asyncHandler(async (req, res) => ok(res, await plannerService.bestTimes(uid(req), req.query as any))),
  planRecommendation: asyncHandler(async (req, res) => ok(res, await plannerService.planRecommendation(uid(req), req.params.id, req.body), 201)),
};
