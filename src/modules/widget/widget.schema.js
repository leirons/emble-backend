import { z } from 'zod';

export const startConversationSchema = z.object({
  visitorId: z.string().min(6).max(200),
});

export const sendMessageSchema = z.object({
  text: z.string().min(1).max(4000),
});

export const advanceFlowSchema = z.object({
  stepId: z.string().max(64).nullable().optional(),
});

export const feedbackSchema = z.object({
  rating: z.union([z.literal(1), z.literal(-1)]),
});

// Только клиентские события — серверные (chat_started, product_recommended и т.п.)
// логируются на бэкенде и не принимаются из виджета, чтобы их нельзя было накрутить.
export const trackEventSchema = z.object({
  type: z.enum(['widget_loaded', 'widget_opened', 'trigger_fired', 'feedback_given']),
  sessionId: z.string().min(3).max(200),
  conversationId: z.string().uuid().optional(),
  payload: z.record(z.string(), z.any()).optional(),
});

export default { startConversationSchema, sendMessageSchema, advanceFlowSchema, feedbackSchema, trackEventSchema };
