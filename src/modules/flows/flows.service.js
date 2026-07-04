import { v4 as uuid } from 'uuid';
import * as flowsRepo from './flows.repo.js';
import * as agentsRepo from '../agents/agents.repo.js';
import * as conversationsRepo from '../chat/conversations.repo.js';
import * as actionsRepo from '../actions/actions.repo.js';
import { executeCustomAction, dispatchEventActions } from '../actions/actions.service.js';
import { logEvent, EVENT_TYPES } from '../analytics/analytics.service.js';
import { notFound } from '../../lib/errors.js';

async function assertAgentOwnership(orgId, agentId) {
  const agent = await agentsRepo.getAgentByIdForOrg(agentId, orgId);
  if (!agent) throw notFound('Агент не найден');
  return agent;
}

export async function createFlow(orgId, agentId, { name, definition }) {
  await assertAgentOwnership(orgId, agentId);
  return flowsRepo.insertFlow({ id: uuid(), agentId, name, definition });
}

export async function listFlows(orgId, agentId) {
  await assertAgentOwnership(orgId, agentId);
  return flowsRepo.listFlowsByAgent(agentId);
}

export async function updateFlow(orgId, agentId, flowId, input) {
  await assertAgentOwnership(orgId, agentId);
  const flow = await flowsRepo.updateFlow(flowId, agentId, input);
  if (!flow) throw notFound('Сценарий не найден');
  return flow;
}

export async function deleteFlow(orgId, agentId, flowId) {
  await assertAgentOwnership(orgId, agentId);
  await flowsRepo.deleteFlow(flowId, agentId);
}

export async function activateFlow(orgId, agentId, flowId) {
  await assertAgentOwnership(orgId, agentId);
  const flow = await flowsRepo.activateFlow(flowId, agentId);
  if (!flow) throw notFound('Сценарий не найден');
  return flow;
}

export async function deactivateFlow(orgId, agentId, flowId) {
  await assertAgentOwnership(orgId, agentId);
  const flow = await flowsRepo.deactivateFlow(flowId, agentId);
  if (!flow) throw notFound('Сценарий не найден');
  return flow;
}

// --- Публичный виджет: пошаговое прохождение активного сценария ---

/**
 * Продвигает диалог по сценарию на один шаг. stepId=null/'start' — начать активный
 * сценарий агента с startStepId. Если сценария/шага нет — сигнализирует handoffToAI,
 * чтобы виджет перешёл на обычный AI-чат.
 * @param {object} agent
 * @param {string} conversationId
 * @param {string|null|undefined} stepId
 */
export async function advanceConversationFlow(agent, conversationId, stepId) {
  const conversation = await conversationsRepo.getConversationForAgent(conversationId, agent.id);
  if (!conversation) throw notFound('Диалог не найден');

  const isStart = !stepId || stepId === 'start';
  const flow = isStart || !conversation.activeFlowId
    ? await flowsRepo.getActiveFlow(agent.id)
    : await flowsRepo.getFlowById(conversation.activeFlowId, agent.id);

  if (!flow) {
    await conversationsRepo.setFlowState(conversationId, agent.id, null, null);
    return { message: null, buttons: [], handoffToAI: true };
  }

  const targetStepId = isStart ? flow.definition.startStepId : stepId;
  const step = flow.definition.steps?.[targetStepId];

  if (!step) {
    await conversationsRepo.setFlowState(conversationId, agent.id, null, null);
    return { message: null, buttons: [], handoffToAI: true };
  }

  if (isStart) {
    await logEvent(agent.id, EVENT_TYPES.FLOW_STARTED, { conversationId, payload: { flowId: flow.id } }).catch(() => {});
  }

  // Шаг сценария может вызывать custom action (например «оформить заявку на звонок»).
  if (step.actionId) {
    void (async () => {
      try {
        const action = await actionsRepo.getActionById(step.actionId, agent.id);
        if (action && action.enabled) {
          await executeCustomAction(action, { event: 'flow_step', flowId: flow.id, stepId: targetStepId, conversationId }, { conversationId });
          await logEvent(agent.id, EVENT_TYPES.ACTION_TRIGGERED, {
            conversationId,
            payload: { actionName: action.name, source: 'flow' },
          }).catch(() => {});
        }
      } catch {
        /* сбой действия не должен ломать прохождение сценария */
      }
    })();
  }

  // Шаг сценария может переводить диалог на оператора (эскалация). Виджет по флагу
  // `escalate` покажет форму сбора email (если включена соответствующая настройка).
  if (step.escalate) {
    const sessionId = conversation.visitorId;
    await conversationsRepo.setConversationStatus(conversationId, agent.id, 'escalated').catch(() => {});
    await conversationsRepo.setFlowState(conversationId, agent.id, null, null).catch(() => {});
    await logEvent(agent.id, EVENT_TYPES.CONVERSATION_ESCALATED, { conversationId, sessionId, payload: { source: 'flow' } }).catch(() => {});
    await logEvent(agent.id, EVENT_TYPES.ESCALATION_REQUESTED, { conversationId, sessionId }).catch(() => {});
    void dispatchEventActions(agent.id, 'conversation_escalated', { conversationId, source: 'flow' });
    return { message: step.message, buttons: [], handoffToAI: false, escalate: true };
  }

  if (step.handoffToAI) {
    await conversationsRepo.setFlowState(conversationId, agent.id, null, null);
    return { message: step.message, buttons: [], handoffToAI: true };
  }

  await conversationsRepo.setFlowState(conversationId, agent.id, flow.id, targetStepId);
  return {
    message: step.message,
    buttons: (step.buttons || []).map((b) => ({ label: b.label, nextStepId: b.nextStepId, handoffToAI: !!b.handoffToAI })),
    handoffToAI: false,
  };
}

export default { createFlow, listFlows, updateFlow, deleteFlow, activateFlow, deactivateFlow, advanceConversationFlow };
