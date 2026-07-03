import * as service from './analytics.service.js';

export async function getSummary(req, res) {
  const days = req.query.days ? parseInt(req.query.days, 10) : 30;
  const summary = await service.getSummary(req.auth.orgId, req.params.agentId, days);
  res.json({ summary });
}

export async function resolveUnanswered(req, res) {
  const result = await service.resolveUnansweredQuestion(req.auth.orgId, req.params.agentId, req.params.questionId);
  res.json(result);
}

export default { getSummary, resolveUnanswered };
