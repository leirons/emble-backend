import { z } from 'zod';

export const createQaSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(4000),
});

export const updateQaSchema = z.object({
  question: z.string().min(1).max(500).optional(),
  answer: z.string().min(1).max(4000).optional(),
});

export default { createQaSchema, updateQaSchema };
