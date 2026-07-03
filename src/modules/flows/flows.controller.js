import * as service from './flows.service.js';

export async function listFlows(req, res) {
  const flows = await service.listFlows(req.auth.orgId, req.params.agentId);
  res.json({ flows });
}

export async function createFlow(req, res) {
  const flow = await service.createFlow(req.auth.orgId, req.params.agentId, req.body);
  res.status(201).json({ flow });
}

export async function updateFlow(req, res) {
  const flow = await service.updateFlow(req.auth.orgId, req.params.agentId, req.params.flowId, req.body);
  res.json({ flow });
}

export async function deleteFlow(req, res) {
  await service.deleteFlow(req.auth.orgId, req.params.agentId, req.params.flowId);
  res.status(204).send();
}

export async function activateFlow(req, res) {
  const flow = await service.activateFlow(req.auth.orgId, req.params.agentId, req.params.flowId);
  res.json({ flow });
}

export async function deactivateFlow(req, res) {
  const flow = await service.deactivateFlow(req.auth.orgId, req.params.agentId, req.params.flowId);
  res.json({ flow });
}

export default { listFlows, createFlow, updateFlow, deleteFlow, activateFlow, deactivateFlow };
