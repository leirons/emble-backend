import * as service from './knowledge.service.js';
import { badRequest } from '../../lib/errors.js';

export async function listSources(req, res) {
  const sources = await service.listSources(req.auth.orgId, req.params.agentId);
  res.json({ sources });
}

export async function getSource(req, res) {
  const source = await service.getSource(req.auth.orgId, req.params.agentId, req.params.sourceId);
  res.json({ source });
}

export async function addFileSource(req, res) {
  if (!req.file) throw badRequest('Файл не передан (поле form-data: file)');
  const source = await service.addFileSource(req.auth.orgId, req.params.agentId, req.file);
  res.status(201).json({ source });
}

export async function addUrlSource(req, res) {
  const source = await service.addUrlSource(req.auth.orgId, req.params.agentId, req.body);
  res.status(201).json({ source });
}

export async function addTextSource(req, res) {
  const source = await service.addTextSource(req.auth.orgId, req.params.agentId, req.body);
  res.status(201).json({ source });
}

export async function deleteSource(req, res) {
  await service.deleteSource(req.auth.orgId, req.params.agentId, req.params.sourceId);
  res.status(204).send();
}

export async function updateSource(req, res) {
  const source = await service.updateSource(req.auth.orgId, req.params.agentId, req.params.sourceId, req.body);
  res.json({ source });
}

export async function resyncSource(req, res) {
  const source = await service.resyncSource(req.auth.orgId, req.params.agentId, req.params.sourceId);
  res.status(202).json({ source });
}

export default {
  listSources,
  getSource,
  addFileSource,
  addUrlSource,
  addTextSource,
  updateSource,
  resyncSource,
  deleteSource,
};
