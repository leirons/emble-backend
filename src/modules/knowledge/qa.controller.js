import * as service from './qa.service.js';

export async function listQaPairs(req, res) {
  const qaPairs = await service.listQaPairs(req.auth.orgId, req.params.agentId);
  res.json({ qaPairs });
}

export async function createQaPair(req, res) {
  const qaPair = await service.createQaPair(req.auth.orgId, req.params.agentId, req.body);
  res.status(201).json({ qaPair });
}

export async function updateQaPair(req, res) {
  const qaPair = await service.updateQaPair(req.auth.orgId, req.params.agentId, req.params.qaId, req.body);
  res.json({ qaPair });
}

export async function deleteQaPair(req, res) {
  await service.deleteQaPair(req.auth.orgId, req.params.agentId, req.params.qaId);
  res.status(204).send();
}

export default { listQaPairs, createQaPair, updateQaPair, deleteQaPair };
