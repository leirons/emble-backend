import { z } from 'zod';

const EVENT_NAMES = ['lead_captured', 'conversation_escalated', 'conversation_started'];

export const createActionSchema = z
  .object({
    name: z
      .string()
      .min(2)
      .max(64)
      .regex(/^[a-z][a-z0-9_]*$/, 'Только строчные латинские буквы, цифры и подчёркивание, начиная с буквы'),
    description: z.string().min(1).max(500),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH']).default('POST'),
    url: z.string().url(),
    headers: z.record(z.string(), z.string()).default({}),
    bodyTemplate: z.record(z.string(), z.any()).default({}),
    paramSchema: z.record(z.string(), z.any()).default({}),
    triggerType: z.enum(['llm_tool', 'event', 'scenario']),
    eventName: z.enum(EVENT_NAMES).optional(),
    enabled: z.boolean().default(true),
  })
  .refine((data) => data.triggerType !== 'event' || !!data.eventName, {
    message: 'eventName обязателен при triggerType=event',
    path: ['eventName'],
  });

export const updateActionSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/)
    .optional(),
  description: z.string().min(1).max(500).optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH']).optional(),
  url: z.string().url().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  bodyTemplate: z.record(z.string(), z.any()).optional(),
  paramSchema: z.record(z.string(), z.any()).optional(),
  triggerType: z.enum(['llm_tool', 'event', 'scenario']).optional(),
  eventName: z.enum(EVENT_NAMES).nullable().optional(),
  enabled: z.boolean().optional(),
});

// Тест действия из дашборда: можно передать либо сохранённую конфигурацию целиком,
// либо произвольные переменные для подстановки в шаблон тела.
export const testActionSchema = z.object({
  url: z.string().url().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH']).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  bodyTemplate: z.record(z.string(), z.any()).optional(),
  variables: z.record(z.string(), z.any()).optional(),
});

export default { createActionSchema, updateActionSchema, testActionSchema };
