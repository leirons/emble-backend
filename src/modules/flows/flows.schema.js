import { z } from 'zod';

const buttonSchema = z.object({
  label: z.string().min(1).max(80),
  nextStepId: z.string().min(1).max(64),
});

const stepSchema = z.object({
  // Сообщение необязательно — шаг может показывать только кнопки.
  message: z.string().max(1000).default(''),
  buttons: z.array(buttonSchema).max(6).default([]),
  handoffToAI: z.boolean().default(false),
  // Опционально: при достижении шага вызвать custom action (по его id) с контекстом диалога.
  actionId: z.string().uuid().nullable().optional(),
});

const definitionSchema = z
  .object({
    startStepId: z.string().min(1).max(64),
    steps: z.record(z.string(), stepSchema),
  })
  .superRefine((data, ctx) => {
    if (!data.steps[data.startStepId]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `startStepId "${data.startStepId}" не найден среди steps`,
        path: ['startStepId'],
      });
    }
    for (const [stepId, step] of Object.entries(data.steps)) {
      step.buttons.forEach((btn, i) => {
        if (!data.steps[btn.nextStepId]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Шаг "${stepId}": кнопка "${btn.label}" ссылается на несуществующий nextStepId "${btn.nextStepId}"`,
            path: ['steps', stepId, 'buttons', i, 'nextStepId'],
          });
        }
      });
    }
  });

export const createFlowSchema = z.object({
  name: z.string().min(1).max(120),
  definition: definitionSchema,
});

export const updateFlowSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  definition: definitionSchema.optional(),
});

export default { createFlowSchema, updateFlowSchema };
