import * as service from './leads.service.js';

export async function listLeads(req, res) {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
  const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
  const leads = await service.listLeads(req.auth.orgId, req.params.agentId, { limit, offset });
  res.json({ leads });
}

export async function exportLeads(req, res) {
  const csv = await service.exportLeadsCsv(req.auth.orgId, req.params.agentId);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
  res.send(csv);
}

export default { listLeads, exportLeads };
