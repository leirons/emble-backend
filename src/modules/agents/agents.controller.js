import * as service from './agents.service.js';
import { AGENT_TEMPLATES } from './templates.js';
import { env } from '../../config/env.js';

export async function listTemplates(req, res) {
  res.json({ templates: AGENT_TEMPLATES });
}

export async function createAgent(req, res) {
  const agent = await service.createAgent(req.auth.orgId, req.body);
  res.status(201).json({ agent });
}

export async function listAgents(req, res) {
  const agents = await service.listAgents(req.auth.orgId);
  res.json({ agents });
}

export async function getAgent(req, res) {
  const agent = await service.getAgent(req.auth.orgId, req.params.agentId);
  res.json({ agent, embedSnippet: service.buildEmbedSnippet(agent, env.widget.cdnBaseUrl) });
}

export async function updateAgent(req, res) {
  const agent = await service.updateAgent(req.auth.orgId, req.params.agentId, req.body);
  res.json({ agent });
}

export async function publishAgent(req, res) {
  const agent = await service.publishAgent(req.auth.orgId, req.params.agentId);
  res.json({ agent, embedSnippet: service.buildEmbedSnippet(agent, env.widget.cdnBaseUrl) });
}

export async function unpublishAgent(req, res) {
  const agent = await service.unpublishAgent(req.auth.orgId, req.params.agentId);
  res.json({ agent });
}

export async function deleteAgent(req, res) {
  await service.deleteAgent(req.auth.orgId, req.params.agentId);
  res.status(204).send();
}

export async function updateBranding(req, res) {
  const branding = await service.updateBranding(req.auth.orgId, req.params.agentId, req.body);
  res.json({ branding });
}

export async function listDomains(req, res) {
  const domains = await service.listDomains(req.auth.orgId, req.params.agentId);
  res.json({ domains });
}

export async function addDomain(req, res) {
  const domain = await service.addDomain(req.auth.orgId, req.params.agentId, req.body.domain);
  res.status(201).json({ domain });
}

export async function removeDomain(req, res) {
  await service.removeDomain(req.auth.orgId, req.params.agentId, req.params.domainId);
  res.status(204).send();
}

export async function getSettings(req, res) {
  const settings = await service.getSettings(req.auth.orgId, req.params.agentId);
  res.json({ settings });
}

export async function updateSettings(req, res) {
  const settings = await service.updateSettings(req.auth.orgId, req.params.agentId, req.body);
  res.json({ settings });
}

export default {
  listTemplates,
  createAgent,
  listAgents,
  getAgent,
  updateAgent,
  publishAgent,
  unpublishAgent,
  deleteAgent,
  updateBranding,
  listDomains,
  addDomain,
  removeDomain,
  getSettings,
  updateSettings,
};
