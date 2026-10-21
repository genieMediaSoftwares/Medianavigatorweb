import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { startTestDb, stopTestDb, clearDb, registerUser, api } from './helpers.js';
import { PlannedContentModel } from '../src/models/PlannedContent.js';

describe('independent Planner audit regressions', () => {
  beforeAll(startTestDb); afterAll(stopTestDb); beforeEach(clearDb);
  const body = (extra = {}) => ({title:'Audit plan', timezone:'UTC', targets:[{platform:'instagram',format:'reel',localDate:'2030-10-20',localTime:'18:00',reminders:[15,0]}], ...extra});
  it('keeps a published plan date when clearDate is requested', async () => {
    const u = await registerUser('clear@test.example');
    const p = (await api().post('/api/v1/planner').set(u.auth).send(body())).body.data.plans[0];
    expect((await api().post(`/api/v1/planner/${p.id}/publish`).set(u.auth).send({})).status).toBe(200);
    expect((await api().patch(`/api/v1/planner/${p.id}`).set(u.auth).send({clearDate:true})).status).toBe(422);
    const detail = await api().get(`/api/v1/planner/${p.id}`).set(u.auth);
    expect(detail.body.data.plan.scheduledAt).toBe(p.scheduledAt);
  });
  it('completing every checklist item never automatically marks ready', async () => {
    const u = await registerUser('check@test.example');
    const p = (await api().post('/api/v1/planner').set(u.auth).send(body())).body.data.plans[0];
    const r = await api().patch(`/api/v1/planner/${p.id}`).set(u.auth).send({checklist:p.checklist.map((c:any)=>({...c,done:true}))});
    expect(r.status).toBe(200); expect(r.body.data.checklistDone).toBe(p.checklist.length); expect(r.body.data.status).toBe('planned');
  });
  it('rejects an invalid second platform without partially creating the first', async () => {
    const u = await registerUser('atomic@test.example');
    const r = await api().post('/api/v1/planner').set(u.auth).send(body({targets:[{platform:'instagram',format:'reel'}, {platform:'youtube',format:'reel'}]}));
    expect(r.status).toBe(422); expect(await PlannedContentModel.countDocuments({userId:u.id})).toBe(0);
  });
  it('editing and deleting one platform leaves its sibling unchanged', async () => {
    const u = await registerUser('group@test.example');
    const r = await api().post('/api/v1/planner').set(u.auth).send(body({targets:[{platform:'instagram',format:'reel'}, {platform:'linkedin',format:'document'}]}));
    const [a,b] = r.body.data.plans;
    expect((await api().patch(`/api/v1/planner/${a.id}`).set(u.auth).send({caption:'IG only'})).status).toBe(200);
    expect((await api().delete(`/api/v1/planner/${a.id}`).set(u.auth)).status).toBe(200);
    expect((await api().get(`/api/v1/planner/${a.id}`).set(u.auth)).status).toBe(404);
    const sibling = (await api().get(`/api/v1/planner/${b.id}`).set(u.auth)).body.data;
    expect(sibling.plan.caption).toBe(''); expect(sibling.group).toEqual([]);
  });
});
