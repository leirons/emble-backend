import { v4 as uuid } from 'uuid';
import * as leadsRepo from './leads.repo.js';
import * as agentsRepo from '../agents/agents.repo.js';
import { logEvent, EVENT_TYPES } from '../analytics/analytics.service.js';
import { dispatchEventActions } from '../actions/actions.service.js';
import { badRequest, notFound } from '../../lib/errors.js';

/** Используется публичным Widget API — без проверки принадлежности к org. */
export async function captureLead(agentId, input) {
  if (!input.email && !input.phone) {
    throw badRequest('Укажите хотя бы email или телефон');
  }
  const lead = await leadsRepo.insertLead({ id: uuid(), agentId, ...input });
  await logEvent(agentId, EVENT_TYPES.LEAD_CAPTURED, { conversationId: input.conversationId });

  if (input.capturedFields?.source === 'email_fallback') {
    await logEvent(agentId, EVENT_TYPES.EMAIL_FALLBACK_CAPTURED, { conversationId: input.conversationId }).catch(() => {});
  }

  void dispatchEventActions(agentId, 'lead_captured', {
    leadId: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    // Пробрасываем источник в CRM-вебхук, чтобы клиент мог атрибутировать лид
    // (manual / auto / escalation / email_fallback). Доступно как {{source}} в body_template.
    source: lead.capturedFields?.source ?? null,
    conversationId: input.conversationId,
  });

  return lead;
}

/** Используется дашбордом — с проверкой принадлежности агента к организации. */
export async function listLeads(orgId, agentId, pagination) {
  const agent = await agentsRepo.getAgentByIdForOrg(agentId, orgId);
  if (!agent) throw notFound('Агент не найден');
  return leadsRepo.listLeadsByAgent(agentId, pagination);
}

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Чистая функция сериализации лидов в CSV (без БД) — вынесена для тестируемости.
 * Колонка «Источник» берётся из captured_fields.source (атрибуция manual/auto/escalation/...).
 */
export function leadsToCsv(leads) {
  const header = ['Дата', 'Имя', 'Email', 'Телефон', 'Источник', 'Диалог'];
  const rows = leads.map((l) =>
    [
      new Date(l.createdAt).toISOString(),
      l.name || '',
      l.email || '',
      l.phone || '',
      l.capturedFields?.source || '',
      l.conversationId || '',
    ]
      .map(csvCell)
      .join(',')
  );
  // BOM, чтобы Excel корректно распознал UTF-8.
  return '﻿' + [header.join(','), ...rows].join('\r\n');
}

/** Формирует CSV со всеми лидами агента. */
export async function exportLeadsCsv(orgId, agentId) {
  const agent = await agentsRepo.getAgentByIdForOrg(agentId, orgId);
  if (!agent) throw notFound('Агент не найден');
  const leads = await leadsRepo.listLeadsByAgent(agentId, { limit: 10000, offset: 0 });
  return leadsToCsv(leads);
}

export default { captureLead, listLeads, exportLeadsCsv, leadsToCsv };
