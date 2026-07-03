import * as chatService from './chat.service.js';

export async function listConversations(req, res) {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
  const conversations = await chatService.listConversations(req.auth.orgId, req.params.agentId, { limit, offset });
  res.json({ conversations });
}

export async function getMessages(req, res) {
  const result = await chatService.getConversationMessages(req.auth.orgId, req.params.agentId, req.params.conversationId);
  res.json(result);
}

export default { listConversations, getMessages };
