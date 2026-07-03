import * as service from './organizations.service.js';

export async function getMyOrganization(req, res) {
  const org = await service.getMyOrganization(req.auth.orgId);
  res.json({ organization: org });
}

export async function listMembers(req, res) {
  const members = await service.listMembers(req.auth.orgId);
  res.json({ members });
}

export async function inviteMember(req, res) {
  const result = await service.inviteMember(req.auth.orgId, req.body);
  res.status(201).json(result);
}

export async function removeMember(req, res) {
  await service.removeMember(req.auth.orgId, req.params.userId, req.auth.userId);
  res.status(204).send();
}

export default { getMyOrganization, listMembers, inviteMember, removeMember };
