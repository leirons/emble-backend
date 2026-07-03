import * as service from './actions.service.js';

export async function listActions(req, res) {
  const actions = await service.listActions(req.auth.orgId, req.params.agentId);
  res.json({ actions });
}

export async function createAction(req, res) {
  const action = await service.createAction(req.auth.orgId, req.params.agentId, req.body);
  res.status(201).json({ action });
}

export async function updateAction(req, res) {
  const action = await service.updateAction(req.auth.orgId, req.params.agentId, req.params.actionId, req.body);
  res.json({ action });
}

export async function deleteAction(req, res) {
  await service.deleteAction(req.auth.orgId, req.params.agentId, req.params.actionId);
  res.status(204).send();
}

export async function listActionLogs(req, res) {
  const logs = await service.listActionLogs(req.auth.orgId, req.params.agentId, req.params.actionId);
  res.json({ logs });
}

export async function testAction(req, res) {
  const result = await service.testAction(req.auth.orgId, req.params.agentId, req.body);
  res.json({ result });
}

export default { listActions, createAction, updateAction, deleteAction, listActionLogs, testAction };
